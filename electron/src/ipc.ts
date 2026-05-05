/**
 * Main-side handlers for every channel exposed via `preload.ts`.
 *
 * Channel names are namespaced `desktop:*` so they're easy to grep for
 * when adding or removing features and so they don't collide with
 * Electron's own internal channels.
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

interface RegisterOptions {
	getWindow: () => BrowserWindow | undefined;
}

export function registerIpcHandlers({ getWindow }: RegisterOptions): void {
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
