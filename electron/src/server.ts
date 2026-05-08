/**
 * Frontend server lifecycle for the Electron shell.
 *
 * Post-Vite migration: the frontend is now a static SPA built by Vite
 * into `frontend/dist/`.  Two modes:
 *
 *   - **dev** — the user already has Vite's dev server running
 *     (`just dev` boots backend + frontend).  We wait for the
 *     configured port and use that URL.
 *
 *   - **prod** — register a custom `app://` protocol via Electron's
 *     `protocol.handle()` API and `loadURL('app://./')`.  This is the
 *     officially-recommended production pattern for Electron + SPAs:
 *
 *       * Avoids `file://` (discouraged by Electron, breaks
 *         TanStack Router's URL parsing per router#5509 — `window.origin`
 *         is the literal string `"null"` under `file://`).
 *       * Avoids spinning up an HTTP server inside the desktop app.
 *       * Plays nicely with client-side routing because the protocol
 *         handler can fall back to `index.html` for unknown paths.
 *
 *   The previous Next.js path spawned a Node child process running
 *   the standalone server bundle; that's gone.  An export alias
 *   `startNextServer` is kept temporarily so any pre-migration
 *   importers (or rebased PRs) keep compiling.
 */

import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { app, net, protocol } from 'electron';
import waitOn from 'wait-on';

/** URL + cleanup handle returned by {@link startFrontendServer}. */
export interface StartedServer {
	url: string;
	stop: () => Promise<void>;
}

interface StartOptions {
	isDev: boolean;
}

/**
 * Port the Electron shell points at in dev mode.  Defaults to 3001
 * (the Vite dev server `just dev` boots).  Override via
 * `ELECTRON_FRONTEND_PORT` to point at one of the spike dev servers.
 */
const DEV_FRONTEND_PORT = (() => {
	const raw = process.env.ELECTRON_FRONTEND_PORT;
	if (raw === undefined || raw === '') return 3001;
	const parsed = Number.parseInt(raw, 10);
	return Number.isNaN(parsed) ? 3001 : parsed;
})();

/** Default backend URL — the FastAPI server `just dev` boots up. */
const DEFAULT_BACKEND_URL = 'http://localhost:8000';

/**
 * Custom protocol scheme registered for the production SPA.  Must be
 * registered as standard + secure + supportFetchAPI **before** the
 * `app.whenReady()` promise resolves so the renderer treats it like a
 * normal HTTPS origin (cookies, fetch, service workers all work).
 */
const SPA_SCHEME = 'app';

protocol.registerSchemesAsPrivileged([
	{
		scheme: SPA_SCHEME,
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			stream: true,
			corsEnabled: true,
		},
	},
]);

/**
 * Resolve the location of the bundled Vite SPA.  In packaged builds
 * the `dist/` tree is copied under `process.resourcesPath/frontend/dist/`;
 * in an unpackaged dev run from a built electron/dist/ we resolve
 * relative to the repo.
 */
function resolveStaticRoot(): string {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, 'frontend', 'dist');
	}
	return path.resolve(__dirname, '..', '..', 'frontend', 'dist');
}

/**
 * Register the `app://` protocol handler that serves the Vite SPA.
 *
 * `protocol.handle()` is the modern (Electron 25+) replacement for the
 * deprecated `protocol.registerFileProtocol` family.  It accepts a
 * standard `Request` and returns a `Response`, so we delegate to
 * `net.fetch` for static files (gives us correct MIME inference,
 * caching headers, range requests for free) and fall back to
 * `index.html` for unknown paths so client-side routes work on direct
 * navigation / window reload.
 *
 * Containment check: `path.resolve` + the `startsWith` guard prevents
 * directory traversal via crafted URLs.
 */
function registerSpaProtocol(staticRoot: string): void {
	const indexHtml = path.join(staticRoot, 'index.html');

	protocol.handle(SPA_SCHEME, async (request) => {
		const url = new URL(request.url);
		const rel = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'index.html';
		let target = path.resolve(staticRoot, rel);

		// Containment: never serve outside the static root.
		if (!target.startsWith(staticRoot)) {
			return new Response('forbidden', { status: 403 });
		}

		// SPA fallback for non-asset paths that don't exist on disk.
		// Asset paths (with an extension) still 404 because serving
		// index.html with the wrong content-type would mis-render.
		if (!existsSync(target) || !statSync(target).isFile()) {
			if (path.extname(rel) === '') {
				target = indexHtml;
			} else {
				return new Response('not found', { status: 404 });
			}
		}

		// `net.fetch` understands `file://` URLs and handles MIME +
		// streaming for us.  Wrap in a try so a missing file surfaces
		// as a clear 500 rather than an uncaught rejection.
		try {
			const fileUrl = `file://${target}`;
			const res = await net.fetch(fileUrl);
			// `net.fetch` keeps file:// 200s on missing files in some
			// edge cases; verify by reading length.
			if (res.status !== 200) {
				return new Response(await res.text(), { status: res.status });
			}
			// Cache hashed assets aggressively; index.html stays hot.
			const headers = new Headers(res.headers);
			if (rel.startsWith('assets/')) {
				headers.set('cache-control', 'public, max-age=31536000, immutable');
			} else {
				headers.set('cache-control', 'no-cache');
			}
			return new Response(res.body, { status: res.status, headers });
		} catch (error) {
			// Belt-and-braces fallback: read the file ourselves.
			try {
				const buffer = await readFile(target);
				return new Response(buffer);
			} catch {
				return new Response(`failed to read ${target}: ${String(error)}`, {
					status: 500,
				});
			}
		}
	});
}

let spaRegistered = false;

/**
 * In production, register the `app://` protocol once and return its
 * canonical entry URL.  `loadURL('app://./')` then renders the SPA
 * with a stable, non-`file://` origin that TanStack Router and any
 * future cookie / service worker code can rely on.
 */
async function startProductionServer(): Promise<StartedServer> {
	const staticRoot = resolveStaticRoot();
	if (!existsSync(staticRoot)) {
		process.stderr.write(
			`[electron] frontend dist not found at ${staticRoot}; ` +
				'did the build step run? (frontend/dist/ should exist after ' +
				'`bun run build` in frontend/)\n',
		);
	}
	if (!spaRegistered) {
		registerSpaProtocol(staticRoot);
		spaRegistered = true;
	}
	const url = `${SPA_SCHEME}://./`;
	process.stderr.write(
		`[electron] serving frontend SPA from ${staticRoot} via ${SPA_SCHEME}:// ` +
			`(backend: ${process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL})\n`,
	);
	return {
		url,
		stop: async (): Promise<void> => {
			// `protocol.unhandle` exists but unregistering between
			// loads creates more problems than it solves; the handler
			// is idempotent and lives for the process lifetime.
		},
	};
}

/**
 * In dev, wait for the user-managed Vite dev server to come up, then
 * return its URL.  We never spawn it ourselves in dev — that would
 * conflict with `just dev` and cost the user their HMR session.
 */
async function attachToDevServer(): Promise<StartedServer> {
	const url = `http://localhost:${DEV_FRONTEND_PORT}`;
	try {
		await waitOn({
			resources: [`tcp:localhost:${DEV_FRONTEND_PORT}`],
			timeout: 60_000,
			interval: 500,
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		const banner = [
			'',
			'═══════════════════════════════════════════════════════════════',
			`  Electron could not reach the dev server on :${DEV_FRONTEND_PORT}`,
			'═══════════════════════════════════════════════════════════════',
			'',
			'  The desktop shell expects the frontend dev server to be',
			'  running before Electron launches. Start it in another',
			'  terminal first, then re-run electron-dev:',
			'',
			'    just dev                # both frontend + backend',
			'    bun --filter app.nexus-ai dev   # frontend only',
			'',
			'  Or run the combined recipe that orchestrates both for you:',
			'',
			'    just electron-dev-all',
			'',
			`  (waited 60s, underlying error: ${reason})`,
			'═══════════════════════════════════════════════════════════════',
			'',
		].join('\n');
		process.stderr.write(banner);
		throw new Error(`Dev server on :${DEV_FRONTEND_PORT} did not come up within 60s`);
	}
	return {
		url,
		stop: async (): Promise<void> => {
			/* dev server is owned by the user — never stop it */
		},
	};
}

/** Public entry: start (or attach to) the frontend server. */
export async function startFrontendServer(options: StartOptions): Promise<StartedServer> {
	return options.isDev ? attachToDevServer() : startProductionServer();
}

/**
 * Backwards-compat alias for code paths that still reference the
 * pre-migration name.  Drop once every importer has migrated.
 */
export const startNextServer = startFrontendServer;
