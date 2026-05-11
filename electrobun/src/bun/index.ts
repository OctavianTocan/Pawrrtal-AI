/**
 * Electrobun main process for the Pawrrtal desktop shell.
 *
 * Equivalent of electron/src/main.ts but using Electrobun APIs.
 *
 * Key differences from the Electron shell:
 *
 *   Electron                              Electrobun
 *   ─────────────────────────────────── ──────────────────────────────────────
 *   ipcMain.handle + contextBridge       BrowserView.defineRPC<PawrrtalRPCType>
 *   preload.ts                           src/shared/rpc-types.ts
 *   electron-store                       src/bun/store.ts (JSON file)
 *   app.getPath('home')                  homedir() from node:os
 *   webContents.send('chan', payload)    win.webview.rpc.send.channelName(payload)
 *   ipcMain.on('permissions:respond')    bun.messages.permissionsRespond handler
 *   BrowserWindow.on('closed')           win.on('close') [same pattern]
 *   app.requestSingleInstanceLock()      Electrobun handles automatically
 *
 * @module
 */

import { homedir } from 'node:os';
import path from 'node:path';

import { ApplicationMenu, BrowserView, BrowserWindow, app } from 'electrobun/bun';

import type { PawrrtalRPCType } from '../shared/rpc-types';
import { handleFsListDirectory, handleFsReadFile, handleFsUnwatch, handleFsWatchDirectory, handleFsWriteFile } from './handlers/fs';
import { handleShellKill, handleShellRun, handleShellSpawnStreaming } from './handlers/shell';
import { getMode, requestPermission, resolvePrompt, setMode, setPromptFn } from './permissions';
import { startNextServer } from './server';
import { addRoot, ensureDefaultWorkspaceRoot, listRoots, removeRoot } from './workspace';

// ELECTROBUN_DEV is not reliably propagated in v1.18 — detect dev mode via
// PAWRRTAL_REPO_ROOT, which the 'bun start' script injects.
const isDev = Boolean(process.env['PAWRRTAL_REPO_ROOT']);

// Mutable window reference — assigned after the Next.js server is ready.
// RPC handlers use optional chaining (win?.webview...) to be safe.
let win: BrowserWindow<PawrrtalRPCType> | undefined;

// ─── RPC definition (replaces ipc.ts + preload.ts) ───────────────────────────

const rpc = BrowserView.defineRPC<PawrrtalRPCType>({
	maxRequestTime: 30_000,
	handlers: {
		requests: {
			// ── Desktop helpers ────────────────────────────────────────────
			openExternal: async ({ url }) => {
				if (typeof url !== 'string') return;
				try {
					const parsed = new URL(url);
					if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
				} catch {
					return;
				}
				// Electrobun exposes shell.openExternal via app utilities.
				// In Electrobun 1.x use the platform shell command.
				const cmd =
					process.platform === 'darwin'
						? 'open'
						: process.platform === 'win32'
							? 'start'
							: 'xdg-open';
				Bun.spawn([cmd, url], { stdout: 'ignore', stderr: 'ignore' });
			},

			showOpenFolderDialog: async () => {
				// TODO: Electrobun native folder dialog API (dialog.showOpenDialog equivalent).
				// As of v1.18 this can be invoked via the native shell; tracked in
				// https://github.com/blackboardsh/electrobun/issues — return null as stub.
				return null;
			},

			getPlatform: async () => process.platform,
			getVersion: async () => app.version,

			// ── Workspace ─────────────────────────────────────────────────
			workspaceListRoots: async () => listRoots(),
			workspaceAddRoot: async ({ rootPath }) => {
				if (rootPath) return addRoot(rootPath);
				// No path provided — show open-folder dialog (stub for now).
				const defaultRoot = path.join(homedir(), 'Pawrrtal-Workspace');
				return addRoot(defaultRoot);
			},
			workspaceRemoveRoot: async ({ rootPath }) => removeRoot(rootPath),

			// ── Filesystem ────────────────────────────────────────────────
			fsReadFile: async ({ filePath }) => handleFsReadFile(filePath),
			fsWriteFile: async ({ filePath, content }) =>
				handleFsWriteFile(filePath, content),
			fsListDirectory: async ({ dirPath }) => handleFsListDirectory(dirPath),
			fsWatchDirectory: async ({ dirPath }) => handleFsWatchDirectory(dirPath, (event) => {
				win?.webview.rpc.send.fsWatchEvent(event);
			}),
			fsUnwatch: async ({ id }) => handleFsUnwatch(id),

			// ── Shell ─────────────────────────────────────────────────────
			shellRun: async (request) => handleShellRun(request),
			shellSpawnStreaming: async (request) =>
				handleShellSpawnStreaming(request, (event) => {
					win?.webview.rpc.send.shellStream(event);
				}, (event) => {
					win?.webview.rpc.send.shellStreamEnd(event);
				}),
			shellKill: async ({ jobId }) => handleShellKill(jobId),

			// ── Permissions ───────────────────────────────────────────────
			permissionsGetMode: async () => getMode(),
			permissionsSetMode: async ({ mode }) => setMode(mode),
		},

		messages: {
			/**
			 * Webview replies to a pending permission prompt.
			 * In Electron: ipcMain.on('permissions:respond', handler).
			 */
			permissionsRespond: (response) => {
				resolvePrompt(response);
			},
		},
	},
});

// ─── App menu (replaces electron/src/menu.ts) ────────────────────────────────
//
// Electrobun's ApplicationMenu API:
//   - Takes a flat Array<ApplicationMenuItemConfig>, not { menu: [...] }
//   - Custom actions use action: 'string' + ApplicationMenu.on('application-menu-clicked')
//   - onClick is not supported; native roles (quit, undo, etc.) fire automatically

ApplicationMenu.setApplicationMenu([
	{
		label: 'File',
		submenu: [
			{ label: 'New Chat', accelerator: 'CmdOrCtrl+T', action: 'new-chat' },
			{ type: 'separator' },
			{ label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' },
		],
	},
	{
		label: 'Edit',
		submenu: [
			{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
			{ label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
			{ type: 'separator' },
			{ label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
			{ label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
			{ label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
			{ label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
		],
	},
]);

// ─── Startup ──────────────────────────────────────────────────────────────────
//
// 1. Ensure workspace root.
// 2. Start the Next.js server (dev: spawn pnpm dev; prod: spawn standalone).
// 3. Create the BrowserWindow only after the server is ready, pointing
//    straight at the real URL. No data: URL splash — Electrobun's preload
//    scripts inject into every page and crypto.subtle is unavailable in
//    data: security contexts.

ensureDefaultWorkspaceRoot();

// Open the splash window immediately so the app appears in the Dock
// and the user sees visible feedback while Next.js + FastAPI boot.
// views://splash/index.html is served by Electrobun's own server — a
// proper secure context, unlike data: URLs (which break crypto.subtle
// in Electrobun's injected preload scripts).
win = new BrowserWindow({
	title: 'Pawrrtal',
	url: 'views://splash/index.html',
	frame: { width: 1280, height: 820 },
	titleBarStyle: 'hiddenInset',
	rpc,
});

setPromptFn((request) => {
	win?.webview.rpc.send.permissionsPrompt(request);
});

// Handle custom menu actions.
ApplicationMenu.on('application-menu-clicked', (event: unknown) => {
	const { action } = event as { action: string };
	if (action === 'new-chat') {
		win?.webview.rpc.send.menuNewChat({});
	}
});

// Start frontend + backend, then navigate the splash to the real URL.
startNextServer({ isDev })
	.then((server) => {
		win?.webview.loadURL(server.url);
	})
	.catch((err: unknown) => {
		const reason = err instanceof Error ? err.message : String(err);
		console.error('[electrobun] startup failed:', reason);
		process.exit(1);
	});
