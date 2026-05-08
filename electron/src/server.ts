/**
 * Frontend server lifecycle for the Electron shell.
 *
 * Two modes:
 *   - **dev** — assumes the user already has the Next.js dev server
 *     running (started by `just dev` or `bun run dev` inside frontend/).
 *     We just wait for `http://localhost:3001` to respond and use it.
 *   - **prod** — spawns the Next.js standalone server we packaged
 *     inside the app bundle, on a free port, and returns the URL.
 *
 * Keeping these two paths in one module means main.ts doesn't have to
 * branch on `isDev` for the load URL — it just calls `startNextServer`
 * and gets back something it can `loadURL()`.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { app } from 'electron';
import waitOn from 'wait-on';

/** URL + cleanup handle returned by {@link startNextServer}. */
export interface StartedServer {
	url: string;
	stop: () => Promise<void>;
}

interface StartOptions {
	isDev: boolean;
}

/** Default port the frontend dev server runs on (mirrors `just dev`). */
const DEV_FRONTEND_PORT = 3001;

/** Default backend URL — the FastAPI server `just dev` boots up. */
const DEFAULT_BACKEND_URL = 'http://localhost:8000';

/**
 * Allocate a port the OS confirms is free. Avoids hard-coding a port
 * that another process might already be using on the user's machine.
 */
function allocateFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const probe = createServer();
		probe.unref();
		probe.on('error', reject);
		probe.listen(0, () => {
			const address = probe.address();
			if (address && typeof address === 'object') {
				const { port } = address;
				probe.close(() => resolve(port));
			} else {
				probe.close(() => reject(new Error('Failed to allocate a free port.')));
			}
		});
	});
}

/**
 * Resolve the location of the bundled Next.js standalone server.
 *
 * In packaged builds the standalone tree lives under
 * `process.resourcesPath/frontend/`. In an unpackaged dev run from a
 * built electron/dist/ we fall back to the repo's frontend/.next/standalone.
 */
function resolveStandaloneRoot(): string {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, 'frontend');
	}
	return path.resolve(__dirname, '..', '..', 'frontend', '.next', 'standalone');
}

/**
 * Spawn the Next.js standalone `server.js` on a free port and return
 * the listening URL.
 */
async function startProductionServer(): Promise<StartedServer> {
	const port = await allocateFreePort();
	const standaloneRoot = resolveStandaloneRoot();
	const entry = path.join(standaloneRoot, 'frontend', 'server.js');

	const env: NodeJS.ProcessEnv = {
		...process.env,
		PORT: String(port),
		HOSTNAME: '127.0.0.1',
		// Inject the backend URL into the spawned Next.js server's
		// process env so `frontend/lib/api.ts` resolves it correctly.
		// `BACKEND_URL` overrides the default if the desktop user has
		// pointed the app at a remote backend via settings.
		NEXT_PUBLIC_API_URL: process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL,
	};

	const child: ChildProcess = spawn(process.execPath, [entry], {
		cwd: path.join(standaloneRoot, 'frontend'),
		env,
		stdio: ['ignore', 'inherit', 'inherit'],
	});

	child.on('error', (err) => {
		// Surface spawn failures via the parent's stderr so packaged
		// builds reveal config errors instead of silently hanging.
		process.stderr.write(`[electron] failed to spawn next: ${String(err)}\n`);
	});

	const url = `http://127.0.0.1:${port}`;
	await waitOn({
		resources: [`tcp:127.0.0.1:${port}`],
		timeout: 30_000,
		interval: 250,
	});

	return {
		url,
		stop: async (): Promise<void> => {
			if (!child.killed) child.kill();
		},
	};
}

/**
 * In dev, wait for the user-managed Next.js dev server to come up,
 * then return its URL. We never spawn it ourselves in dev — that
 * would conflict with `just dev` and cost the user their HMR session.
 *
 * If the dev server isn't running after 60s, surface an actionable
 * message instead of letting wait-on's stack trace dump as an
 * unhandled rejection — the most common cause is the user forgetting
 * to start `just dev` in another terminal before launching Electron.
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
export async function startNextServer(options: StartOptions): Promise<StartedServer> {
	return options.isDev ? attachToDevServer() : startProductionServer();
}
