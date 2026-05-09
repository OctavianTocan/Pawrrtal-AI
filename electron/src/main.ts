/**
 * Electron main process for the Pawrrtal desktop shell.
 *
 * Responsible for:
 *   1. Acquiring a single-instance lock so launching the app twice
 *      focuses the existing window instead of opening a duplicate.
 *   2. Spawning (in production) or waiting for (in development) the
 *      Next.js frontend server, then loading it into a BrowserWindow.
 *   3. Restoring the previous window size + position from disk.
 *   4. Routing every external link through the OS browser via
 *      `shell.openExternal`.
 *   5. Wiring the IPC API surfaced via `preload.ts`.
 *
 * The renderer never gets Node integration; all privileged operations
 * cross the contextBridge through the typed `pawrrtal` channel.
 */

import path from 'node:path';
import { app, BrowserWindow, shell } from 'electron';

import { disposeFsWatchers } from './handlers/fs';
import { disposeShellJobs } from './handlers/shell';
import { registerIpcHandlers } from './ipc';
import { createStore } from './lib/typed-store';
import { buildApplicationMenu } from './menu';
import { type StartedServer, startNextServer } from './server';
import { MACOS_TITLE_BAR_STYLE } from './window-chrome';
import { ensureDefaultWorkspaceRoot } from './workspace';

/** Persisted BrowserWindow geometry saved via {@link windowStore}. */
interface WindowState {
	width: number;
	height: number;
	x?: number;
	y?: number;
	maximized?: boolean;
}

/** Small persistent store for window geometry. */
const windowStore = createStore<{ window: WindowState }>({
	defaults: {
		window: { width: 1280, height: 820, maximized: false },
	},
});

/** Holds the spawned Next.js server in production builds. */
let server: StartedServer | undefined;
let mainWindow: BrowserWindow | undefined;

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

/**
 * Inline splash HTML loaded into the BrowserWindow before the dev /
 * standalone Next.js server is reachable. Shipping it as a `data:` URL
 * keeps the desktop bundle a single TS source — no asset copy step —
 * and means the window paints something immediately even when the
 * server is still booting (which can take up to 60s on a cold dev start).
 *
 * Without this, launching `just electron-dev` without a running dev
 * server presents the user with a silent dock icon and no window for
 * 60 seconds. The splash makes the wait observable.
 *
 * @returns A self-contained `data:text/html` URL safe to pass to
 *          `BrowserWindow.loadURL`.
 */
function buildSplashDataUrl(): string {
	// IMPORTANT: do NOT set `-webkit-app-region: drag` here. macOS reads
	// drag regions at the OS level and Chromium has a known quirk where
	// they can persist after navigating away from the page that declared
	// them — the next page's clicks get eaten as "drag the window" while
	// keyboard focus still works. With `titleBarStyle: 'default'` the native
	// title bar is draggable; we don't need `-webkit-app-region: drag` here.
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Pawrrtal</title>
<style>
	html, body { margin: 0; padding: 0; height: 100%; }
	body {
		background: #F7F4ED;
		color: #2a2a2a;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
		display: flex; align-items: center; justify-content: center;
		-webkit-font-smoothing: antialiased;
	}
	.box { text-align: center; padding: 24px 32px; }
	.spinner {
		width: 28px; height: 28px;
		border: 2px solid rgba(0,0,0,0.12);
		border-top-color: #2a2a2a;
		border-radius: 50%;
		margin: 0 auto 14px;
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	h1 { font-size: 14px; font-weight: 500; margin: 0 0 4px; }
	p  { font-size: 12px; opacity: 0.55; margin: 0; }
</style></head>
<body>
	<div class="box">
		<div class="spinner" aria-hidden="true"></div>
		<h1>Starting Pawrrtal…</h1>
		<p>Waiting for dev server on :3001</p>
	</div>
</body></html>`;
	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Inline error page shown when the dev server never came up. Same
 * rationale as the splash — keep it inline so the bundle stays single-
 * source. Mirrors the stderr banner in `server.ts` so the user gets
 * the same instructions regardless of whether they were watching the
 * terminal or just the window.
 *
 * @param reason Underlying error message from `wait-on`.
 * @returns A self-contained `data:text/html` URL.
 */
function buildErrorDataUrl(reason: string): string {
	const safeReason = reason.replace(/[<>&]/g, '');
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Pawrrtal — dev server unreachable</title>
<style>
	html, body { margin: 0; padding: 0; height: 100%; }
	body {
		background: #F7F4ED; color: #2a2a2a;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
		display: flex; align-items: center; justify-content: center;
		-webkit-font-smoothing: antialiased;
	}
	.box { max-width: 520px; padding: 24px 32px; }
	h1 { font-size: 16px; margin: 0 0 12px; }
	p  { font-size: 13px; line-height: 1.5; opacity: 0.7; margin: 0 0 8px; }
	code {
		font-family: ui-monospace, "SF Mono", Menlo, monospace;
		font-size: 12px;
		background: rgba(0,0,0,0.05);
		padding: 1px 5px; border-radius: 4px;
	}
	.muted { opacity: 0.45; font-size: 11px; margin-top: 16px; }
</style></head>
<body>
	<div class="box">
		<h1>Couldn't reach the dev server on :3001</h1>
		<p>Start the Next.js dev server first, then relaunch the desktop shell:</p>
		<p><code>just dev</code> &nbsp; (terminal 1)<br /><code>just electron-dev</code> &nbsp; (terminal 2)</p>
		<p>Or in one shot: <code>just electron-dev-full</code>.</p>
		<p class="muted">${safeReason}</p>
	</div>
</body></html>`;
	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Build the app's primary BrowserWindow with security defaults.
 *
 * `nodeIntegration: false` + `contextIsolation: true` + `sandbox: true`
 * is the load-bearing security tuple — the renderer cannot reach
 * Node, the global object is isolated from the page's, and OS sandbox
 * primitives lock the process down. All privileged ops flow through
 * the preload bridge in `preload.ts`.
 *
 * @param targetUrl Initial URL — pass the splash `data:` URL on first
 *                  open and swap to the real server URL once it's up.
 */
function createWindow(targetUrl: string): BrowserWindow {
	const stored = windowStore.get('window');
	const window = new BrowserWindow({
		width: stored.width,
		height: stored.height,
		x: stored.x,
		y: stored.y,
		minWidth: 720,
		minHeight: 480,
		title: 'Pawrrtal',
		backgroundColor: '#F7F4ED',
		frame: true,
		// See `window-chrome.ts`: overlay styles (`hidden` / `hiddenInset`) paint
		// Chromium traffic lights inside the page — they look smaller than native
		// AppKit controls; `default` keeps full-size buttons in the standard strip.
		...(process.platform === 'darwin'
			? {
					titleBarStyle: MACOS_TITLE_BAR_STYLE,
				}
			: {}),
		show: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webSecurity: true,
		},
	});

	if (stored.maximized) window.maximize();

	// Open every external link in the OS browser. Without this, an `<a
	// target="_blank">` would open a second BrowserWindow inside Electron,
	// which is rarely what the user wants for marketing links.
	window.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url).catch(() => {
			/* swallow — failure to open in browser shouldn't crash the app */
		});
		return { action: 'deny' };
	});

	// Persist size + position so the window opens where the user last
	// left it. Debounce isn't strictly needed because resize events fire
	// at the OS frame rate which electron-store handles fine.
	const saveBounds = (): void => {
		if (window.isDestroyed()) return;
		const bounds = window.getBounds();
		windowStore.set('window', {
			width: bounds.width,
			height: bounds.height,
			x: bounds.x,
			y: bounds.y,
			maximized: window.isMaximized(),
		});
	};
	window.on('resize', saveBounds);
	window.on('move', saveBounds);
	window.on('maximize', saveBounds);
	window.on('unmaximize', saveBounds);

	window.once('ready-to-show', () => window.show());
	void window.loadURL(targetUrl);
	return window;
}

/**
 * Application startup: ensure workspace defaults, open the splash window,
 * register IPC + menu, attach to or start the Next.js server, then navigate
 * the window to the real URL (or the dev-server error page on failure).
 */
async function bootstrap(): Promise<void> {
	// Auto-create the default workspace root before any privileged op
	// can run (every fs/shell handler validates against the allowlist).
	ensureDefaultWorkspaceRoot();

	// Open the window with the splash *immediately* so the user gets
	// visible feedback during the dev-server wait (which can be ≤60s).
	// Previously the BrowserWindow wasn't created until startNextServer
	// resolved, so a missed `just dev` invocation looked like the app
	// silently failed to launch — only a dock icon, no window.
	mainWindow = createWindow(buildSplashDataUrl());
	buildApplicationMenu({ getWindow: () => mainWindow });
	registerIpcHandlers({ getWindow: () => mainWindow });

	try {
		server = await startNextServer({ isDev });
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		if (mainWindow && !mainWindow.isDestroyed()) {
			void mainWindow.loadURL(buildErrorDataUrl(reason));
		}
		return;
	}

	if (mainWindow && !mainWindow.isDestroyed()) {
		void mainWindow.loadURL(server.url);
	}
}

// Single-instance lock: a second `open` call focuses the existing window
// rather than spinning up a duplicate (and a duplicate Next.js server,
// which would clash on the port).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
} else {
	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});

	app.whenReady().then(() => {
		void bootstrap();
		app.on('activate', () => {
			// macOS: re-create a window when the dock icon is clicked
			// and there are no other windows open.
			if (BrowserWindow.getAllWindows().length === 0 && server) {
				mainWindow = createWindow(server.url);
			}
		});
	});

	app.on('window-all-closed', () => {
		// Standard cross-platform behavior: keep the app alive on
		// macOS until the user explicitly quits via Cmd+Q.
		if (process.platform !== 'darwin') app.quit();
	});

	app.on('before-quit', () => {
		// Tear down privileged-op resources before the Next.js server,
		// so a slow watcher close doesn't hold the quit hostage.
		disposeShellJobs();
		void disposeFsWatchers();
		void server?.stop();
	});
}
