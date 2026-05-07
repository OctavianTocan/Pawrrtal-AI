/**
 * Preload script — runs in an isolated world inside every BrowserWindow.
 *
 * Bridges a tightly-scoped API into the renderer via `contextBridge` so
 * the page can call into Electron-only features without ever touching
 * Node, `require`, or the full ipcRenderer surface. Every channel
 * declared here has a matching `ipcMain.handle` (or `ipcMain.on`) in
 * `ipc.ts` and the per-feature handler files.
 *
 * Whenever the desktop API surface grows, update both this file AND the
 * mirror declaration in `frontend/lib/desktop.ts` so the FE keeps a
 * single typed entrypoint that works on web (no-op fallbacks) and in
 * Electron (real implementations).
 */

import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron';

interface OkBase {
	ok: true;
	[key: string]: unknown;
}
interface FailResult {
	ok: false;
	reason: string;
}
type Result<T extends Record<string, unknown> = Record<string, never>> = (OkBase & T) | FailResult;

interface DirEntry {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	modifiedAt: number;
}

interface RunRequest {
	command: string;
	args?: string[];
	cwd: string;
	env?: Record<string, string>;
	timeoutMs?: number;
}

interface RunResult extends Record<string, unknown> {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

interface WatchEvent {
	id: string;
	type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'error';
	path: string;
}

interface ShellStreamEvent {
	jobId: string;
	channel: 'stdout' | 'stderr';
	line: string;
}

interface ShellStreamEnd {
	jobId: string;
	exitCode: number | null;
	error?: string;
}

interface PermissionPromptRequest {
	id: string;
	op: 'fs:write' | 'shell:run' | 'shell:spawn';
	subject: string;
	rootId?: string;
	context?: Record<string, unknown>;
}

interface PermissionPromptResponse {
	id: string;
	decision: 'allow' | 'deny';
	scope: 'once' | 'session' | 'always';
}

const desktopApi = {
	// --- existing surface ---------------------------------------------------
	/**
	 * Host platform exposed synchronously so the renderer can make layout
	 * decisions (e.g. reserve space for the macOS traffic-light buttons
	 * under `titleBarStyle: 'hidden'`) on first paint, without having
	 * to round-trip through `desktop:get-platform` and re-render.
	 *
	 * Sandboxed preloads still get access to `process.platform`, so this
	 * is safe to read at preload-load time.
	 */
	platform: process.platform,
	openExternal: (url: string): Promise<void> => ipcRenderer.invoke('desktop:open-external', url),
	showOpenFolderDialog: (): Promise<string | null> =>
		ipcRenderer.invoke('desktop:open-folder-dialog'),
	getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('desktop:get-platform'),
	getVersion: (): Promise<string> => ipcRenderer.invoke('desktop:get-version'),
	onMenuNewChat: (handler: () => void): (() => void) => {
		const wrapped = (): void => handler();
		ipcRenderer.on('desktop:menu-new-chat', wrapped);
		return () => ipcRenderer.removeListener('desktop:menu-new-chat', wrapped);
	},

	// --- workspace ---------------------------------------------------------
	workspace: {
		listRoots: (): Promise<string[]> => ipcRenderer.invoke('workspace:list-roots'),
		addRoot: (rootPath?: string): Promise<string[]> =>
			ipcRenderer.invoke('workspace:add-root', rootPath),
		removeRoot: (rootPath: string): Promise<string[]> =>
			ipcRenderer.invoke('workspace:remove-root', rootPath),
	},

	// --- filesystem --------------------------------------------------------
	fs: {
		readFile: (filePath: string): Promise<Result<{ content: string }>> =>
			ipcRenderer.invoke('fs:read-file', filePath),
		writeFile: (filePath: string, content: string): Promise<Result> =>
			ipcRenderer.invoke('fs:write-file', filePath, content),
		listDirectory: (dirPath: string): Promise<Result<{ entries: DirEntry[] }>> =>
			ipcRenderer.invoke('fs:list-directory', dirPath),
		watchDirectory: (dirPath: string): Promise<Result<{ id: string }>> =>
			ipcRenderer.invoke('fs:watch-directory', dirPath),
		unwatch: (id: string): Promise<Result> => ipcRenderer.invoke('fs:unwatch', id),
		onWatchEvent: (handler: (event: WatchEvent) => void): (() => void) => {
			const wrapped = (_event: IpcRendererEvent, payload: WatchEvent): void =>
				handler(payload);
			ipcRenderer.on('fs:watch-event', wrapped);
			return () => ipcRenderer.removeListener('fs:watch-event', wrapped);
		},
	},

	// --- shell -------------------------------------------------------------
	shell: {
		run: (request: RunRequest): Promise<Result<RunResult>> =>
			ipcRenderer.invoke('shell:run', request),
		spawnStreaming: (request: RunRequest): Promise<Result<{ jobId: string }>> =>
			ipcRenderer.invoke('shell:spawn-streaming', request),
		kill: (jobId: string): Promise<Result> => ipcRenderer.invoke('shell:kill', jobId),
		onStream: (handler: (event: ShellStreamEvent) => void): (() => void) => {
			const wrapped = (_event: IpcRendererEvent, payload: ShellStreamEvent): void =>
				handler(payload);
			ipcRenderer.on('shell:stream', wrapped);
			return () => ipcRenderer.removeListener('shell:stream', wrapped);
		},
		onStreamEnd: (handler: (event: ShellStreamEnd) => void): (() => void) => {
			const wrapped = (_event: IpcRendererEvent, payload: ShellStreamEnd): void =>
				handler(payload);
			ipcRenderer.on('shell:stream-end', wrapped);
			return () => ipcRenderer.removeListener('shell:stream-end', wrapped);
		},
	},

	// --- permissions -------------------------------------------------------
	permissions: {
		getMode: (): Promise<'default' | 'accept-edits' | 'yolo' | 'plan'> =>
			ipcRenderer.invoke('permissions:get-mode'),
		setMode: (
			mode: 'default' | 'accept-edits' | 'yolo' | 'plan'
		): Promise<'default' | 'accept-edits' | 'yolo' | 'plan'> =>
			ipcRenderer.invoke('permissions:set-mode', mode),
		respond: (response: PermissionPromptResponse): void =>
			ipcRenderer.send('permissions:respond', response),
		onPrompt: (handler: (request: PermissionPromptRequest) => void): (() => void) => {
			const wrapped = (_event: IpcRendererEvent, payload: PermissionPromptRequest): void =>
				handler(payload);
			ipcRenderer.on('permissions:prompt', wrapped);
			return () => ipcRenderer.removeListener('permissions:prompt', wrapped);
		},
	},
};

contextBridge.exposeInMainWorld('aiNexus', desktopApi);

/** Type augmentation consumed by `frontend/lib/desktop.ts`. */
export type DesktopApi = typeof desktopApi;
