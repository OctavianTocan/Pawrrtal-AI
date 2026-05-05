/**
 * Preload script — runs in an isolated world inside every BrowserWindow.
 *
 * Bridges a tightly-scoped API into the renderer via `contextBridge` so
 * the page can call into Electron-only features without ever touching
 * Node, `require`, or the full ipcRenderer surface. Every channel
 * declared here has a matching `ipcMain.handle` in `ipc.ts`.
 *
 * Whenever the desktop API surface grows, update both this file AND the
 * mirror declaration in `frontend/lib/desktop.ts` so the FE keeps a
 * single typed entrypoint that works on web (no-op fallbacks) and in
 * Electron (real implementations).
 */

import { contextBridge, ipcRenderer } from 'electron';

const desktopApi = {
	/** Open `url` in the user's default browser. */
	openExternal: (url: string): Promise<void> => ipcRenderer.invoke('desktop:open-external', url),
	/** Show a native folder-pick dialog and resolve to the chosen path (or null). */
	showOpenFolderDialog: (): Promise<string | null> =>
		ipcRenderer.invoke('desktop:open-folder-dialog'),
	/** Identify the current OS so the FE can branch on Cmd vs Ctrl, etc. */
	getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('desktop:get-platform'),
	/** Return the running app version (matches package.json). */
	getVersion: (): Promise<string> => ipcRenderer.invoke('desktop:get-version'),
	/**
	 * Subscribe to "user picked File → New chat" via Cmd/Ctrl+N from the
	 * native menu. Returns an unsubscribe function. The FE wires this up
	 * once at the AppLayout level and routes to `/` on every fire.
	 */
	onMenuNewChat: (handler: () => void): (() => void) => {
		const wrapped = (): void => handler();
		ipcRenderer.on('desktop:menu-new-chat', wrapped);
		return () => ipcRenderer.removeListener('desktop:menu-new-chat', wrapped);
	},
};

contextBridge.exposeInMainWorld('aiNexus', desktopApi);

/** Type augmentation consumed by `frontend/lib/desktop.ts`. */
export type DesktopApi = typeof desktopApi;
