/**
 * Single typed entrypoint for desktop-only features.
 *
 * The zero-native shell (`desktop/src/main.zig`) exposes native capabilities
 * via `window.zero.invoke(command, payload)`. This module is the frontend's
 * only allowed reader of that object — every component that wants to call
 * into the desktop shell goes through here so we have:
 *
 *   1. **One detection point** for `isDesktop()`.
 *   2. **Web-safe fallbacks** for every method.
 *   3. **Typed surface** matching the Zig bridge contract.
 *
 * Streaming ops (fs.watchDirectory, shell.spawnStreaming, permissions.onPrompt,
 * onMenuNewChat) are NOT supported in the zero-native shell. The bridge is
 * request/response only; push events require a zero-native API that does not
 * exist yet. These functions return `{ ok: false, reason: 'not-supported' }`
 * and no-op unsubscribe functions so existing call sites degrade gracefully.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Window type augmentation
// ---------------------------------------------------------------------------

declare global {
	interface Window {
		/**
		 * Injected by the zero-native runtime into the WebView before the page
		 * loads. Present only when running inside the desktop shell.
		 */
		zero?: {
			invoke: (command: string, payload?: Record<string, unknown>) => Promise<unknown>;
			windows?: {
				create: (options: Record<string, unknown>) => Promise<unknown>;
				list: () => Promise<unknown[]>;
				focus: (id: string) => Promise<void>;
				close: (id: string) => Promise<void>;
			};
		};
	}
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** True when the app is running inside the zero-native desktop shell. */
export function isDesktop(): boolean {
	return typeof window !== 'undefined' && typeof window.zero !== 'undefined';
}

/**
 * Synchronous platform getter — kept for API compatibility with prior
 * Electron shell.
 *
 * In the Electron shell this returned `process.platform` synchronously via
 * the preload bridge. zero-native does not expose a synchronous platform
 * property. The macOS traffic-light spacing workaround that required this
 * is no longer needed because zero-native uses the system title bar.
 *
 * @returns Always null. Use `getPlatform()` for informational async access.
 */
export function getDesktopPlatformSync(): null {
	return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DESKTOP_ONLY_FAIL = { ok: false as const, reason: 'desktop-only' };
const NOT_SUPPORTED_FAIL = { ok: false as const, reason: 'not-supported' };

async function invoke<T = unknown>(command: string, payload: Record<string, unknown> = {}): Promise<T> {
	// biome-ignore lint/style/noNonNullAssertion: callers guard with isDesktop()
	return window.zero!.invoke(command, payload) as Promise<T>;
}

// ---------------------------------------------------------------------------
// Desktop helpers
// ---------------------------------------------------------------------------

/**
 * Open `url` in the user's default browser on desktop, or in a new tab on
 * web. Swallows failures so a broken link never crashes the calling component.
 */
export async function openExternal(url: string): Promise<void> {
	try {
		if (isDesktop()) {
			await invoke('desktop.openExternal', { url });
			return;
		}
		window.open(url, '_blank', 'noopener,noreferrer');
	} catch {
		/* swallow */
	}
}

/**
 * Show a native folder/file picker on desktop via the zero-native
 * `zero-native.dialog.openFile` builtin command.
 * Returns the selected path, or null on web / cancellation.
 */
export async function showOpenFolderDialog(): Promise<string | null> {
	if (!isDesktop()) return null;
	try {
		const result = await invoke<{ paths?: string[] }>('zero-native.dialog.openFile', {
			title: 'Select Workspace Folder',
			allowMultiple: false,
		});
		return result.paths?.[0] ?? null;
	} catch {
		return null;
	}
}

/** Resolve the host platform asynchronously. Returns 'web' when not in the shell. */
export async function getPlatform(): Promise<string> {
	if (!isDesktop()) return 'web';
	const result = await invoke<{ platform: string }>('desktop.getPlatform');
	return result.platform;
}

/** Resolve the desktop app version, or null on web. */
export async function getDesktopVersion(): Promise<string | null> {
	if (!isDesktop()) return null;
	const result = await invoke<{ version: string }>('desktop.getVersion');
	return result.version;
}

/**
 * Subscribe to "File → New Chat" from the native menu.
 *
 * NOT SUPPORTED in the zero-native shell — menu events require a push-event
 * API not yet available. Returns a no-op unsubscribe.
 */
export function onMenuNewChat(_handler: () => void): () => void {
	return (): void => { /* no-op */ };
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

/** List the current workspace allowlist. Empty array on web. */
export async function listWorkspaceRoots(): Promise<string[]> {
	if (!isDesktop()) return [];
	const result = await invoke<{ roots: string[] }>('workspace.listRoots');
	return result.roots ?? [];
}

/**
 * Add a workspace root. When `rootPath` is omitted on desktop, opens the
 * native folder picker. No-op + empty list on web.
 */
export async function addWorkspaceRoot(rootPath?: string): Promise<string[]> {
	if (!isDesktop()) return [];
	let path = rootPath;
	if (!path) {
		path = (await showOpenFolderDialog()) ?? undefined;
	}
	if (!path) return listWorkspaceRoots();
	const result = await invoke<{ roots: string[] }>('workspace.addRoot', { path });
	return result.roots ?? [];
}

export async function removeWorkspaceRoot(rootPath: string): Promise<string[]> {
	if (!isDesktop()) return [];
	const result = await invoke<{ roots: string[] }>('workspace.removeRoot', { path: rootPath });
	return result.roots ?? [];
}

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export async function readFile(filePath: string): Promise<DesktopResult<{ content: string }>> {
	if (!isDesktop()) return DESKTOP_ONLY_FAIL;
	return invoke('fs.readFile', { path: filePath }) as Promise<DesktopResult<{ content: string }>>;
}

export async function writeFile(filePath: string, content: string): Promise<DesktopResult> {
	if (!isDesktop()) return DESKTOP_ONLY_FAIL;
	return invoke('fs.writeFile', { path: filePath, content }) as Promise<DesktopResult>;
}

export async function listDirectory(
	dirPath: string,
): Promise<DesktopResult<{ entries: DirEntry[] }>> {
	if (!isDesktop()) return DESKTOP_ONLY_FAIL;
	return invoke('fs.listDirectory', { path: dirPath }) as Promise<
		DesktopResult<{ entries: DirEntry[] }>
	>;
}

/**
 * NOT SUPPORTED — fs watch events require a push-event API not yet available
 * in zero-native. Returns the not-supported sentinel.
 */
export async function watchDirectory(
	_dirPath: string,
): Promise<DesktopResult<{ id: string }>> {
	return NOT_SUPPORTED_FAIL;
}

/** NOT SUPPORTED — see watchDirectory. */
export async function unwatchDirectory(_id: string): Promise<DesktopResult> {
	return NOT_SUPPORTED_FAIL;
}

/** NOT SUPPORTED — see watchDirectory. No-op unsubscribe returned. */
export function onFsWatchEvent(_handler: (event: WatchEvent) => void): () => void {
	return (): void => { /* no-op */ };
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export async function runShell(
	request: ShellRunRequest,
): Promise<DesktopResult<ShellRunResult>> {
	if (!isDesktop()) return DESKTOP_ONLY_FAIL;
	return invoke('shell.run', {
		command: request.command,
		cwd: request.cwd,
		timeoutMs: request.timeoutMs ?? 30_000,
	}) as Promise<DesktopResult<ShellRunResult>>;
}

/**
 * NOT SUPPORTED — streaming shell output requires push events not yet
 * available in the zero-native bridge.
 */
export async function spawnShellStreaming(
	_request: ShellRunRequest,
): Promise<DesktopResult<{ jobId: string }>> {
	return NOT_SUPPORTED_FAIL;
}

/** NOT SUPPORTED — see spawnShellStreaming. */
export async function killShellJob(_jobId: string): Promise<DesktopResult> {
	return NOT_SUPPORTED_FAIL;
}

/** NOT SUPPORTED — see spawnShellStreaming. No-op unsubscribe returned. */
export function onShellStream(_handler: (event: ShellStreamEvent) => void): () => void {
	return (): void => { /* no-op */ };
}

/** NOT SUPPORTED — see spawnShellStreaming. No-op unsubscribe returned. */
export function onShellStreamEnd(_handler: (event: ShellStreamEnd) => void): () => void {
	return (): void => { /* no-op */ };
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function getPermissionMode(): Promise<PermissionMode | 'web'> {
	if (!isDesktop()) return 'web';
	const result = await invoke<{ mode: PermissionMode }>('permissions.getMode');
	return result.mode;
}

export async function setPermissionMode(mode: PermissionMode): Promise<PermissionMode | 'web'> {
	if (!isDesktop()) return 'web';
	const result = await invoke<{ mode: PermissionMode }>('permissions.setMode', { mode });
	return result.mode;
}

/**
 * NOT SUPPORTED — permission prompts are push events; zero-native bridge
 * has no push mechanism yet. No-op.
 */
export function respondToPermissionPrompt(_response: PermissionPromptResponse): void {
	/* no-op in zero-native shell */
}

/** NOT SUPPORTED — see respondToPermissionPrompt. No-op unsubscribe returned. */
export function onPermissionPrompt(
	_handler: (request: PermissionPromptRequest) => void,
): () => void {
	return (): void => { /* no-op */ };
}
