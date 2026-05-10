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
import { addRoot, ensureDefaultWorkspaceRoot, listRoots, removeRoot } from './workspace';

const isDev = process.env['ELECTROBUN_DEV'] === '1';

/** Next.js dev server or standalone server URL. */
const FRONTEND_URL = isDev ? 'http://localhost:3000' : 'http://localhost:3001';

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

// ─── Window ───────────────────────────────────────────────────────────────────

const win = new BrowserWindow({
	title: 'Pawrrtal',
	url: FRONTEND_URL,
	frame: { width: 1280, height: 820 },
	// hiddenInset mirrors MACOS_TITLE_BAR_STYLE = 'hiddenInset' in Electron shell.
	titleBarStyle: 'hiddenInset',
	rpc,
});

// Wire the prompt sender now that we have a window to send to.
setPromptFn((request) => {
	win.webview.rpc.send.permissionsPrompt(request);
});

// ─── App menu (replaces electron/src/menu.ts) ────────────────────────────────

ApplicationMenu.setMenu({
	menu: [
		{
			label: 'File',
			submenu: [
				{
					label: 'New Chat',
					accelerator: 'CmdOrCtrl+T',
					onClick: () => {
						win.webview.rpc.send.menuNewChat({});
					},
				},
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
	],
});

// ─── Startup ──────────────────────────────────────────────────────────────────

ensureDefaultWorkspaceRoot();
