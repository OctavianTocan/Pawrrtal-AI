/**
 * Electron main process for the AI Nexus desktop shell.
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
 * cross the contextBridge through the typed `aiNexus` channel.
 */

import path from 'node:path';
import { app, BrowserWindow, shell } from 'electron';
import Store from 'electron-store';
import { registerIpcHandlers } from './ipc';
import { buildApplicationMenu } from './menu';
import { type StartedServer, startNextServer } from './server';

interface WindowState {
	width: number;
	height: number;
	x?: number;
	y?: number;
	maximized?: boolean;
}

/** Small persistent store for window geometry. */
const windowStore = new Store<{ window: WindowState }>({
	defaults: {
		window: { width: 1280, height: 820, maximized: false },
	},
});

/** Holds the spawned Next.js server in production builds. */
let server: StartedServer | undefined;
let mainWindow: BrowserWindow | undefined;

const isDev = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

/**
 * Build the app's primary BrowserWindow with security defaults.
 *
 * `nodeIntegration: false` + `contextIsolation: true` + `sandbox: true`
 * is the load-bearing security tuple — the renderer cannot reach
 * Node, the global object is isolated from the page's, and OS sandbox
 * primitives lock the process down. All privileged ops flow through
 * the preload bridge in `preload.ts`.
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
		title: 'AI Nexus',
		backgroundColor: '#F7F4ED',
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
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

async function bootstrap(): Promise<void> {
	server = await startNextServer({ isDev });
	mainWindow = createWindow(server.url);
	buildApplicationMenu({ getWindow: () => mainWindow });
	registerIpcHandlers({ getWindow: () => mainWindow });
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
		void server?.stop();
	});
}
