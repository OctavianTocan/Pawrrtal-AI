/**
 * Shared RPC type definition for Pawrrtal's Electrobun shell.
 *
 * This file is the single source of truth for the typed bridge between
 * the Bun main process and the webview (Next.js renderer). It replaces
 * the Electron pair of `preload.ts` (contextBridge) + `ipc.ts`
 * (ipcMain.handle) with Electrobun's `BrowserView.defineRPC<T>` system.
 *
 * Structure:
 *   bun.*     — functions/messages that run in the Bun main process,
 *               callable from the webview via rpc.request.*
 *   webview.* — functions/messages pushed TO the webview from Bun,
 *               callable via win.webview.rpc.send.* / rpc.request.*
 *
 * Import this type in:
 *   src/bun/index.ts          → BrowserView.defineRPC<PawrrtalRPCType>
 *   src/webview/electroview.ts → Electroview.defineRPC<PawrrtalRPCType>
 *
 * @module
 */

// Electrobun re-exports RPCSchema from electrobun/bun and electrobun/view.
// We use `import type` so this file stays runtime-free (safe to import in
// both bun and webview contexts without pulling in native bindings).
import type { RPCSchema } from 'electrobun/bun';

// ─── Shared sub-types ────────────────────────────────────────────────────────

export interface DirEntry {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	modifiedAt: number;
}

export interface RunRequest {
	command: string;
	args?: string[];
	cwd: string;
	env?: Record<string, string>;
	timeoutMs?: number;
}

export interface RunResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

export interface WatchEvent {
	id: string;
	type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'error';
	path: string;
}

export interface ShellStreamEvent {
	jobId: string;
	channel: 'stdout' | 'stderr';
	line: string;
}

export interface ShellStreamEnd {
	jobId: string;
	exitCode: number | null;
	error?: string;
}

export interface PermissionPromptRequest {
	id: string;
	op: 'fs:write' | 'shell:run' | 'shell:spawn';
	subject: string;
	rootId?: string;
	context?: Record<string, unknown>;
}

export type PermissionMode = 'default' | 'accept-edits' | 'yolo' | 'plan';
export type PermissionDecision = 'allow' | 'deny';
export type PermissionScope = 'once' | 'session' | 'always';

interface OkBase {
	ok: true;
	[key: string]: unknown;
}
interface FailResult {
	ok: false;
	reason: string;
}
export type Result<T extends Record<string, unknown> = Record<string, never>> =
	| (OkBase & T)
	| FailResult;

// ─── RPC Schema ──────────────────────────────────────────────────────────────

/**
 * Full typed surface for Pawrrtal's IPC bridge.
 *
 * Electron → Electrobun mapping:
 *   ipcMain.handle('channel', handler)              → bun.requests.*
 *   ipcRenderer.invoke('channel', args)             → rpc.request.*
 *   webContents.send('channel', payload)            → webview.messages.*
 *   ipcMain.on('permissions:respond', ...)          → bun.messages.*
 *   contextBridge.exposeInMainWorld('pawrrtal', api) → this type + Electroview
 */
export type PawrrtalRPCType = {
	/** Handlers that execute in the Bun main process. */
	bun: RPCSchema<{
		requests: {
			// ── Desktop helpers ────────────────────────────────────────────
			/** Open a URL in the system browser (validates http/https). */
			openExternal: { params: { url: string }; response: void };
			/** Show a native open-folder dialog. */
			showOpenFolderDialog: { params: Record<never, never>; response: string | null };
			/** Return the host OS platform string. */
			getPlatform: { params: Record<never, never>; response: string };
			/** Return the app version string. */
			getVersion: { params: Record<never, never>; response: string };

			// ── Workspace ─────────────────────────────────────────────────
			workspaceListRoots: { params: Record<never, never>; response: string[] };
			workspaceAddRoot: { params: { rootPath?: string }; response: string[] };
			workspaceRemoveRoot: { params: { rootPath: string }; response: string[] };

			// ── Filesystem ────────────────────────────────────────────────
			fsReadFile: {
				params: { filePath: string };
				response: Result<{ content: string }>;
			};
			fsWriteFile: {
				params: { filePath: string; content: string };
				response: Result;
			};
			fsListDirectory: {
				params: { dirPath: string };
				response: Result<{ entries: DirEntry[] }>;
			};
			fsWatchDirectory: {
				params: { dirPath: string };
				response: Result<{ id: string }>;
			};
			fsUnwatch: { params: { id: string }; response: Result };

			// ── Shell ─────────────────────────────────────────────────────
			shellRun: { params: RunRequest; response: Result<RunResult> };
			shellSpawnStreaming: {
				params: RunRequest;
				response: Result<{ jobId: string }>;
			};
			shellKill: { params: { jobId: string }; response: Result };

			// ── Permissions ───────────────────────────────────────────────
			permissionsGetMode: { params: Record<never, never>; response: PermissionMode };
			permissionsSetMode: { params: { mode: PermissionMode }; response: PermissionMode };
		};

		messages: {
			/**
			 * Webview replies to a pending permission prompt.
			 * In Electron this was ipcMain.on('permissions:respond', ...).
			 */
			permissionsRespond: {
				id: string;
				decision: PermissionDecision;
				scope: PermissionScope;
			};
		};
	}>;

	/** Messages pushed from the Bun process to the webview. */
	webview: RPCSchema<{
		requests: Record<never, never>;
		messages: {
			/**
			 * Bun asks the webview to render a permission prompt modal.
			 * In Electron this was webContents.send('permissions:prompt', ...).
			 */
			permissionsPrompt: PermissionPromptRequest;

			/**
			 * Bun notifies the webview of a filesystem watch event.
			 * In Electron: ipcRenderer.on('fs:watch-event', handler).
			 */
			fsWatchEvent: WatchEvent;

			/**
			 * Bun streams stdout/stderr lines from a shell job.
			 * In Electron: ipcRenderer.on('shell:stream', handler).
			 */
			shellStream: ShellStreamEvent;
			shellStreamEnd: ShellStreamEnd;

			/** App-level signals. */
			menuNewChat: Record<never, never>;
		};
	}>;
};
