/**
 * Single typed entrypoint for desktop-only features.
 *
 * The Electron preload script (`electron/src/preload.ts`) injects an
 * `aiNexus` object onto `window` via `contextBridge`. This module is
 * the FE's only allowed reader of that object — every component that
 * wants to call into the desktop shell goes through here so we have:
 *
 *   1. **One detection point** for `isDesktop()` (no per-component
 *      `typeof window.aiNexus` checks scattered through the codebase).
 *   2. **Web-safe fallbacks** for every method, so the same call site
 *      works in both shells (e.g. `openExternal` falls back to
 *      `window.open(...)` in the browser).
 *   3. **Typed surface** mirroring the preload's `DesktopApi` type
 *      without a build-time dependency on the Electron workspace.
 */

/**
 * Bridge surface exposed by `electron/src/preload.ts`. Mirrored here
 * (rather than imported) because the frontend doesn't depend on the
 * Electron workspace at compile time — the bridge is a runtime
 * contract validated at the seam.
 */
/**
 * Result envelope every privileged op returns. Web fallbacks return
 * `{ ok: false, reason: 'web' }` so call sites can branch on the same
 * shape regardless of shell.
 */
export type DesktopResult<T extends Record<string, unknown> = Record<string, never>> =
	| ({ ok: true } & T)
	| { ok: false; reason: string };

export interface DirEntry {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	modifiedAt: number;
}

export interface ShellRunRequest {
	command: string;
	args?: string[];
	cwd: string;
	env?: Record<string, string>;
	timeoutMs?: number;
}

export interface ShellRunResult extends Record<string, unknown> {
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

export interface PermissionPromptResponse {
	id: string;
	decision: 'allow' | 'deny';
	scope: 'once' | 'session' | 'always';
}

export type PermissionMode = 'default' | 'accept-edits' | 'yolo' | 'plan';

interface WorkspaceBridge {
	listRoots: () => Promise<string[]>;
	addRoot: (rootPath?: string) => Promise<string[]>;
	removeRoot: (rootPath: string) => Promise<string[]>;
}

interface FsBridge {
	readFile: (filePath: string) => Promise<DesktopResult<{ content: string }>>;
	writeFile: (filePath: string, content: string) => Promise<DesktopResult>;
	listDirectory: (dirPath: string) => Promise<DesktopResult<{ entries: DirEntry[] }>>;
	watchDirectory: (dirPath: string) => Promise<DesktopResult<{ id: string }>>;
	unwatch: (id: string) => Promise<DesktopResult>;
	onWatchEvent: (handler: (event: WatchEvent) => void) => () => void;
}

interface ShellBridge {
	run: (request: ShellRunRequest) => Promise<DesktopResult<ShellRunResult>>;
	spawnStreaming: (request: ShellRunRequest) => Promise<DesktopResult<{ jobId: string }>>;
	kill: (jobId: string) => Promise<DesktopResult>;
	onStream: (handler: (event: ShellStreamEvent) => void) => () => void;
	onStreamEnd: (handler: (event: ShellStreamEnd) => void) => () => void;
}

interface PermissionsBridge {
	getMode: () => Promise<PermissionMode>;
	setMode: (mode: PermissionMode) => Promise<PermissionMode>;
	respond: (response: PermissionPromptResponse) => void;
	onPrompt: (handler: (request: PermissionPromptRequest) => void) => () => void;
}

interface DesktopBridge {
	/**
	 * Host platform string, exposed synchronously by the preload script so
	 * the renderer can make layout decisions (e.g. reserve space for macOS
	 * traffic-light buttons) without an async IPC round-trip on first paint.
	 */
	platform: NodeJS.Platform;
	openExternal: (url: string) => Promise<void>;
	showOpenFolderDialog: () => Promise<string | null>;
	getPlatform: () => Promise<NodeJS.Platform>;
	getVersion: () => Promise<string>;
	onMenuNewChat: (handler: () => void) => () => void;
	workspace: WorkspaceBridge;
	fs: FsBridge;
	shell: ShellBridge;
	permissions: PermissionsBridge;
}

declare global {
	interface Window {
		/** Present only when running inside the Electron desktop shell. */
		aiNexus?: DesktopBridge;
	}
}

/** True when the app is running inside the Electron desktop shell. */
export function isDesktop(): boolean {
	return typeof window !== 'undefined' && typeof window.aiNexus !== 'undefined';
}

/**
 * Open `url` in the user's default browser on desktop, or in a new tab
 * on web. Always swallow failures — opening a link must never crash
 * the calling component.
 */
export async function openExternal(url: string): Promise<void> {
	try {
		if (window.aiNexus) {
			await window.aiNexus.openExternal(url);
			return;
		}
		window.open(url, '_blank', 'noopener,noreferrer');
	} catch {
		/* swallow — link-opening must never throw */
	}
}

/**
 * Show a native folder picker on desktop, or `null` on web (the
 * browser has no equivalent that can return a real filesystem path —
 * `<input type="file" webkitdirectory>` only exposes file blobs).
 */
export async function showOpenFolderDialog(): Promise<string | null> {
	if (window.aiNexus) return window.aiNexus.showOpenFolderDialog();
	return null;
}

/** Resolve the host platform; returns 'web' when not running in Electron. */
export async function getPlatform(): Promise<NodeJS.Platform | 'web'> {
	if (window.aiNexus) return window.aiNexus.getPlatform();
	return 'web';
}

/**
 * Synchronous platform getter intended for layout decisions that have to
 * run on first paint (e.g. macOS Electron drag chrome). Returns `null` when
 * not in Electron or during SSR.
 *
 * Components that read this MUST gate it behind `useEffect` so the
 * initial render matches the SSR output and React doesn't blow up with
 * a hydration mismatch.
 *
 * @returns The Electron host platform, or `null` on web / SSR.
 */
export function getDesktopPlatformSync(): NodeJS.Platform | null {
	if (typeof window === 'undefined') return null;
	return window.aiNexus?.platform ?? null;
}

/** Resolve the desktop app version, or `null` on web. */
export async function getDesktopVersion(): Promise<string | null> {
	if (window.aiNexus) return window.aiNexus.getVersion();
	return null;
}

/**
 * Subscribe to "user picked File → New chat" from the native menu.
 * No-op + null unsubscribe on web.
 */
export function onMenuNewChat(handler: () => void): () => void {
	if (window.aiNexus) return window.aiNexus.onMenuNewChat(handler);
	return () => {
		/* no-op on web */
	};
}

// ----------------------------------------------------------------------------
// Workspace + privileged-op wrappers
//
// On web every method returns a `{ ok: false, reason: 'desktop-only' }`
// envelope so call sites can branch on the same shape. Components that
// need to surface this to the user should toast "This feature requires
// the desktop app" — `desktop-only` is the canonical sentinel.
// ----------------------------------------------------------------------------

const WEB_ONLY_FAIL = { ok: false as const, reason: 'desktop-only' };

/** List the current workspace allowlist. Empty array on web. */
export async function listWorkspaceRoots(): Promise<string[]> {
	if (window.aiNexus) return window.aiNexus.workspace.listRoots();
	return [];
}

/**
 * Add a workspace root. When `rootPath` is omitted, opens the native
 * folder picker on desktop. No-op + empty list on web.
 */
export async function addWorkspaceRoot(rootPath?: string): Promise<string[]> {
	if (window.aiNexus) return window.aiNexus.workspace.addRoot(rootPath);
	return [];
}

export async function removeWorkspaceRoot(rootPath: string): Promise<string[]> {
	if (window.aiNexus) return window.aiNexus.workspace.removeRoot(rootPath);
	return [];
}

// --- fs ---------------------------------------------------------------------

export async function readFile(filePath: string): Promise<DesktopResult<{ content: string }>> {
	if (window.aiNexus) return window.aiNexus.fs.readFile(filePath);
	return WEB_ONLY_FAIL;
}

export async function writeFile(filePath: string, content: string): Promise<DesktopResult> {
	if (window.aiNexus) return window.aiNexus.fs.writeFile(filePath, content);
	return WEB_ONLY_FAIL;
}

export async function listDirectory(
	dirPath: string
): Promise<DesktopResult<{ entries: DirEntry[] }>> {
	if (window.aiNexus) return window.aiNexus.fs.listDirectory(dirPath);
	return WEB_ONLY_FAIL;
}

export async function watchDirectory(dirPath: string): Promise<DesktopResult<{ id: string }>> {
	if (window.aiNexus) return window.aiNexus.fs.watchDirectory(dirPath);
	return WEB_ONLY_FAIL;
}

export async function unwatchDirectory(id: string): Promise<DesktopResult> {
	if (window.aiNexus) return window.aiNexus.fs.unwatch(id);
	return WEB_ONLY_FAIL;
}

export function onFsWatchEvent(handler: (event: WatchEvent) => void): () => void {
	if (window.aiNexus) return window.aiNexus.fs.onWatchEvent(handler);
	return () => {
		/* */
	};
}

// --- shell ------------------------------------------------------------------

export async function runShell(request: ShellRunRequest): Promise<DesktopResult<ShellRunResult>> {
	if (window.aiNexus) return window.aiNexus.shell.run(request);
	return WEB_ONLY_FAIL;
}

export async function spawnShellStreaming(
	request: ShellRunRequest
): Promise<DesktopResult<{ jobId: string }>> {
	if (window.aiNexus) return window.aiNexus.shell.spawnStreaming(request);
	return WEB_ONLY_FAIL;
}

export async function killShellJob(jobId: string): Promise<DesktopResult> {
	if (window.aiNexus) return window.aiNexus.shell.kill(jobId);
	return WEB_ONLY_FAIL;
}

export function onShellStream(handler: (event: ShellStreamEvent) => void): () => void {
	if (window.aiNexus) return window.aiNexus.shell.onStream(handler);
	return () => {
		/* */
	};
}

export function onShellStreamEnd(handler: (event: ShellStreamEnd) => void): () => void {
	if (window.aiNexus) return window.aiNexus.shell.onStreamEnd(handler);
	return () => {
		/* */
	};
}

// --- permissions ------------------------------------------------------------

export async function getPermissionMode(): Promise<PermissionMode | 'web'> {
	if (window.aiNexus) return window.aiNexus.permissions.getMode();
	return 'web';
}

export async function setPermissionMode(mode: PermissionMode): Promise<PermissionMode | 'web'> {
	if (window.aiNexus) return window.aiNexus.permissions.setMode(mode);
	return 'web';
}

export function respondToPermissionPrompt(response: PermissionPromptResponse): void {
	window.aiNexus?.permissions.respond(response);
}

export function onPermissionPrompt(
	handler: (request: PermissionPromptRequest) => void
): () => void {
	if (window.aiNexus) return window.aiNexus.permissions.onPrompt(handler);
	return () => {
		/* */
	};
}
