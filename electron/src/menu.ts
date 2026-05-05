/**
 * Native application menu for the AI Nexus desktop shell.
 *
 * Cross-platform with a macOS-leaning template: on macOS, every app
 * gets a leading menu named after itself (About / Hide / Quit), so we
 * include that block conditionally. The remaining menus mirror the
 * standard sets every desktop user expects (File / Edit / View /
 * Window / Help) so muscle memory carries over from any other app.
 *
 * Menu items that the FE needs to react to (e.g. "New chat") fire IPC
 * events the renderer subscribes to through `frontend/lib/desktop.ts`.
 */

import { app, type BrowserWindow, Menu, type MenuItemConstructorOptions, shell } from 'electron';

interface BuildOptions {
	getWindow: () => BrowserWindow | undefined;
}

const DOCS_URL = 'https://github.com/OctavianTocan/ai-nexus#readme';

/**
 * Build + install the application menu.
 *
 * Idempotent: calling this twice replaces the menu rather than
 * stacking it. Safe to call after window creation.
 */
export function buildApplicationMenu({ getWindow }: BuildOptions): void {
	const isMac = process.platform === 'darwin';

	const macAppMenu: MenuItemConstructorOptions[] = isMac
		? [
				{
					label: app.name,
					submenu: [
						{ role: 'about' },
						{ type: 'separator' },
						{ role: 'services' },
						{ type: 'separator' },
						{ role: 'hide' },
						{ role: 'hideOthers' },
						{ role: 'unhide' },
						{ type: 'separator' },
						{ role: 'quit' },
					],
				},
			]
		: [];

	const fileMenu: MenuItemConstructorOptions = {
		label: 'File',
		submenu: [
			{
				label: 'New chat',
				accelerator: 'CmdOrCtrl+N',
				click: () => {
					getWindow()?.webContents.send('desktop:menu-new-chat');
				},
			},
			{ type: 'separator' },
			isMac ? { role: 'close' } : { role: 'quit' },
		],
	};

	const editMenu: MenuItemConstructorOptions = {
		label: 'Edit',
		submenu: [
			{ role: 'undo' },
			{ role: 'redo' },
			{ type: 'separator' },
			{ role: 'cut' },
			{ role: 'copy' },
			{ role: 'paste' },
			...(isMac
				? ([
						{ role: 'pasteAndMatchStyle' },
						{ role: 'delete' },
						{ role: 'selectAll' },
					] as MenuItemConstructorOptions[])
				: ([
						{ role: 'delete' },
						{ type: 'separator' },
						{ role: 'selectAll' },
					] as MenuItemConstructorOptions[])),
		],
	};

	const isPackaged = app.isPackaged;
	const viewMenu: MenuItemConstructorOptions = {
		label: 'View',
		submenu: [
			{ role: 'reload' },
			{ role: 'forceReload' },
			...(isPackaged ? [] : ([{ role: 'toggleDevTools' }] as MenuItemConstructorOptions[])),
			{ type: 'separator' },
			{ role: 'resetZoom' },
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' },
		],
	};

	const windowMenu: MenuItemConstructorOptions = {
		label: 'Window',
		submenu: [
			{ role: 'minimize' },
			{ role: 'zoom' },
			...(isMac
				? ([
						{ type: 'separator' },
						{ role: 'front' },
						{ type: 'separator' },
						{ role: 'window' },
					] as MenuItemConstructorOptions[])
				: ([{ role: 'close' }] as MenuItemConstructorOptions[])),
		],
	};

	const helpMenu: MenuItemConstructorOptions = {
		role: 'help',
		submenu: [
			{
				label: 'Documentation',
				click: () => {
					void shell.openExternal(DOCS_URL);
				},
			},
		],
	};

	const template: MenuItemConstructorOptions[] = [
		...macAppMenu,
		fileMenu,
		editMenu,
		viewMenu,
		windowMenu,
		helpMenu,
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
