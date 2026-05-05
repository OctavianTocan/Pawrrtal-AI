/**
 * Main-side handlers for every channel exposed via `preload.ts`.
 *
 * Channel names are namespaced `desktop:*` so they're easy to grep for
 * when adding or removing features and so they don't collide with
 * Electron's own internal channels.
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

import { registerFsHandlers } from './handlers/fs';
import { registerShellHandlers } from './handlers/shell';
import { registerPermissionIpc } from './permissions';
import { addRoot, listRoots, removeRoot } from './workspace';

interface RegisterOptions {
	getWindow: () => BrowserWindow | undefined;
}

export function registerIpcHandlers({ getWindow }: RegisterOptions): void {
	registerPermissionIpc(getWindow);
	registerFsHandlers({ getWindow });
	registerShellHandlers({ getWindow });
	registerWorkspaceHandlers({ getWindow });

	ipcMain.handle('desktop:open-external', async (_event, url: unknown): Promise<void> => {
		// Reject anything that isn't an http/https URL so a compromised
		// renderer can't `file://` its way into the user's filesystem
		// or launch a `vbs:` handler on Windows.
		if (typeof url !== 'string') return;
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
		} catch {
			return;
		}
		await shell.openExternal(url);
	});

	ipcMain.handle('desktop:open-folder-dialog', async (): Promise<string | null> => {
		const window = getWindow();
		const result = await dialog.showOpenDialog(window ?? new BrowserWindow({ show: false }), {
			properties: ['openDirectory', 'createDirectory'],
		});
		if (result.canceled) return null;
		return result.filePaths[0] ?? null;
	});

	ipcMain.handle('desktop:get-platform', (): NodeJS.Platform => process.platform);

	ipcMain.handle('desktop:get-version', (): string => app.getVersion());
}

/**
 * Workspace management channels — list/add/remove allowlisted roots.
 * Read-only `list-roots` doesn't gate; mutations come from a UI surface
 * the user already drove (folder picker dialog), so the user is the
 * gate.
 */
function registerWorkspaceHandlers({ getWindow }: RegisterOptions): void {
	ipcMain.handle('workspace:list-roots', () => listRoots());

	ipcMain.handle('workspace:add-root', async (_event, rawPath: unknown) => {
		if (typeof rawPath === 'string') {
			return addRoot(rawPath);
		}
		// No path supplied -> show the native folder picker, then add.
		const window = getWindow();
		const result = await dialog.showOpenDialog(window ?? new BrowserWindow({ show: false }), {
			properties: ['openDirectory', 'createDirectory'],
		});
		if (result.canceled || !result.filePaths[0]) return listRoots();
		return addRoot(result.filePaths[0]);
	});

	ipcMain.handle('workspace:remove-root', (_event, rawPath: unknown) => {
		if (typeof rawPath !== 'string') return listRoots();
		return removeRoot(rawPath);
	});
}
