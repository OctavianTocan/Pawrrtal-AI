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

const isDev = process.env['ELECTROBUN_DEV'] === '1';

/** Must match server.ts — used in the splash message only. */
const DEV_FRONTEND_PORT = 3001;

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
				win.webview.rpc.send.fsWatchEvent(event);
			}),
			fsUnwatch: async ({ id }) => handleFsUnwatch(id),

			// ── Shell ─────────────────────────────────────────────────────
			shellRun: async (request) => handleShellRun(request),
			shellSpawnStreaming: async (request) =>
				handleShellSpawnStreaming(request, (event) => {
					win.webview.rpc.send.shellStream(event);
				}, (event) => {
					win.webview.rpc.send.shellStreamEnd(event);
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
// 2. Open a splash window immediately so the dock icon and chrome appear
//    while the Next.js server is booting (mirrors Electron splash pattern).
// 3. startNextServer: in dev, spawns `pnpm dev` from <repo>/frontend/;
//    in prod, spawns the bundled standalone server on a free port.
// 4. Navigate the webview to the real URL once the server is ready.

ensureDefaultWorkspaceRoot();

const splashHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#F7F4ED;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;color:#2a2a2a;-webkit-font-smoothing:antialiased}
.s{text-align:center}.sp{width:24px;height:24px;border:2px solid rgba(0,0,0,.12);border-top-color:#2a2a2a;border-radius:50%;margin:0 auto 12px;animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
h1{font-size:13px;font-weight:500;margin:0 0 4px}p{font-size:11px;opacity:.5;margin:0}
</style></head><body><div class="s"><div class="sp"></div><h1>Starting Pawrrtal…</h1><p>Booting dev server on :3001</p></div></body></html>`;

const win = new BrowserWindow({
	title: 'Pawrrtal',
	url: `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`,
	frame: { width: 1280, height: 820 },
	titleBarStyle: 'hiddenInset',
	rpc,
});

// Wire the prompt sender now that we have a window.
setPromptFn((request) => {
	win.webview.rpc.send.permissionsPrompt(request);
});

// Handle custom menu actions.
ApplicationMenu.on('application-menu-clicked', (event: unknown) => {
	const { action } = event as { action: string };
	if (action === 'new-chat') {
		win.webview.rpc.send.menuNewChat({});
	}
});

// Start the Next.js server, then navigate the splash to the real URL.
startNextServer({ isDev })
	.then((server) => {
		win.webview.loadURL(server.url);
	})
	.catch((err: unknown) => {
		const reason = err instanceof Error ? err.message : String(err);
		console.error('[electrobun] failed to start Next.js server:', reason);
		const errorHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
			html,body{margin:0;height:100%;background:#F7F4ED;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;}
			.b{max-width:480px;padding:24px}h1{font-size:15px;margin:0 0 10px}p{font-size:13px;opacity:.7;line-height:1.5;margin:0 0 8px}
			code{font-family:ui-monospace,monospace;font-size:12px;background:rgba(0,0,0,.06);padding:1px 5px;border-radius:3px}
		</style></head><body><div class="b">
			<h1>Could not start the Next.js server</h1>
			<p>${reason.replace(/[<>&]/g, '')}</p>
			<p>Run <code>bun start</code> from the <code>electrobun/</code> directory.</p>
		</div></body></html>`;
		win.webview.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
	});
