import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getDesktopVersion,
	getPermissionMode,
	getPlatform,
	isDesktop,
	killShellJob,
	listDirectory,
	listWorkspaceRoots,
	onFsWatchEvent,
	onMenuNewChat,
	onPermissionPrompt,
	onShellStream,
	onShellStreamEnd,
	openExternal,
	readFile,
	removeWorkspaceRoot,
	respondToPermissionPrompt,
	runShell,
	setPermissionMode,
	showOpenFolderDialog,
	spawnShellStreaming,
	unwatchDirectory,
	watchDirectory,
	writeFile,
} from './desktop';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockInvoke = ReturnType<typeof vi.fn>;

function makeZeroBridge(invoke: MockInvoke) {
	return { invoke };
}

// ---------------------------------------------------------------------------
// Suite 1: web shell (no zero bridge)
// ---------------------------------------------------------------------------

describe('lib/desktop (web shell — no zero bridge)', () => {
	beforeEach(() => {
		(window as unknown as { zero?: unknown }).zero = undefined;
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reports the app is not running on desktop', () => {
		expect(isDesktop()).toBe(false);
	});

	it('falls back to window.open for openExternal', async () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);
		await openExternal('https://example.com');
		expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
	});

	it('returns null from showOpenFolderDialog (no web equivalent)', async () => {
		await expect(showOpenFolderDialog()).resolves.toBeNull();
	});

	it('returns "web" for getPlatform', async () => {
		await expect(getPlatform()).resolves.toBe('web');
	});

	it('returns null from getDesktopVersion', async () => {
		await expect(getDesktopVersion()).resolves.toBeNull();
	});

	it('returns a no-op unsubscribe from onMenuNewChat', () => {
		const unsubscribe = onMenuNewChat(() => undefined);
		expect(typeof unsubscribe).toBe('function');
		expect(() => unsubscribe()).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Suite 2: zero-native shell — bridge present
// ---------------------------------------------------------------------------

describe('lib/desktop (zero-native shell — bridge present)', () => {
	let invoke: MockInvoke;

	beforeEach(() => {
		invoke = vi.fn();
		(window as unknown as { zero: unknown }).zero = makeZeroBridge(invoke);
	});
	afterEach(() => {
		(window as unknown as { zero?: unknown }).zero = undefined;
		vi.restoreAllMocks();
	});

	it('reports the app is running on desktop', () => {
		expect(isDesktop()).toBe(true);
	});

	// --- openExternal ---

	it('routes openExternal through the bridge', async () => {
		invoke.mockResolvedValue(undefined);
		await openExternal('https://example.com');
		expect(invoke).toHaveBeenCalledWith('desktop.openExternal', { url: 'https://example.com' });
	});

	// --- showOpenFolderDialog ---

	it('returns selected path from showOpenFolderDialog', async () => {
		invoke.mockResolvedValue({ paths: ['/Users/me/Code'] });
		await expect(showOpenFolderDialog()).resolves.toBe('/Users/me/Code');
		expect(invoke).toHaveBeenCalledWith('zero-native.dialog.openFile', {
			title: 'Select Workspace Folder',
			allowMultiple: false,
		});
	});

	it('returns null from showOpenFolderDialog when paths is empty', async () => {
		invoke.mockResolvedValue({ paths: [] });
		await expect(showOpenFolderDialog()).resolves.toBeNull();
	});

	it('returns null from showOpenFolderDialog on bridge error', async () => {
		invoke.mockRejectedValue(new Error('cancelled'));
		await expect(showOpenFolderDialog()).resolves.toBeNull();
	});

	// --- getPlatform ---

	it('returns the platform reported by the bridge', async () => {
		invoke.mockResolvedValue({ platform: 'darwin' });
		await expect(getPlatform()).resolves.toBe('darwin');
		expect(invoke).toHaveBeenCalledWith('desktop.getPlatform', {});
	});

	// --- getDesktopVersion ---

	it('returns the version reported by the bridge', async () => {
		invoke.mockResolvedValue({ version: '1.0.0' });
		await expect(getDesktopVersion()).resolves.toBe('1.0.0');
		expect(invoke).toHaveBeenCalledWith('desktop.getVersion', {});
	});

	// --- workspace ---

	it('listWorkspaceRoots routes through bridge', async () => {
		invoke.mockResolvedValue({ roots: ['/Users/me/Code'] });
		await expect(listWorkspaceRoots()).resolves.toEqual(['/Users/me/Code']);
		expect(invoke).toHaveBeenCalledWith('workspace.listRoots', {});
	});

	it('removeWorkspaceRoot routes through bridge', async () => {
		invoke.mockResolvedValue({ roots: [] });
		await expect(removeWorkspaceRoot('/Users/me/Code')).resolves.toEqual([]);
		expect(invoke).toHaveBeenCalledWith('workspace.removeRoot', { path: '/Users/me/Code' });
	});

	// --- fs ---

	it('readFile routes through bridge', async () => {
		invoke.mockResolvedValue({ ok: true, content: 'hello' });
		await expect(readFile('/x/file.txt')).resolves.toEqual({ ok: true, content: 'hello' });
		expect(invoke).toHaveBeenCalledWith('fs.readFile', { path: '/x/file.txt' });
	});

	it('writeFile routes through bridge', async () => {
		invoke.mockResolvedValue({ ok: true });
		await expect(writeFile('/x/file.txt', 'hello')).resolves.toEqual({ ok: true });
		expect(invoke).toHaveBeenCalledWith('fs.writeFile', { path: '/x/file.txt', content: 'hello' });
	});

	it('listDirectory routes through bridge', async () => {
		invoke.mockResolvedValue({ ok: true, entries: [] });
		await expect(listDirectory('/x')).resolves.toEqual({ ok: true, entries: [] });
		expect(invoke).toHaveBeenCalledWith('fs.listDirectory', { path: '/x' });
	});

	// --- shell ---

	it('runShell routes through bridge', async () => {
		invoke.mockResolvedValue({ ok: true, stdout: 'hi\n', stderr: '', exitCode: 0 });
		const result = await runShell({ command: 'echo hi', cwd: '/x' });
		expect(result).toEqual({ ok: true, stdout: 'hi\n', stderr: '', exitCode: 0 });
		expect(invoke).toHaveBeenCalledWith('shell.run', {
			command: 'echo hi',
			cwd: '/x',
			timeoutMs: 30_000,
		});
	});

	it('runShell forwards custom timeoutMs', async () => {
		invoke.mockResolvedValue({ ok: true, stdout: '', stderr: '', exitCode: 0 });
		await runShell({ command: 'sleep 5', cwd: '/x', timeoutMs: 5_000 });
		expect(invoke).toHaveBeenCalledWith('shell.run', expect.objectContaining({ timeoutMs: 5_000 }));
	});

	// --- permissions ---

	it('getPermissionMode routes through bridge', async () => {
		invoke.mockResolvedValue({ mode: 'default' });
		await expect(getPermissionMode()).resolves.toBe('default');
		expect(invoke).toHaveBeenCalledWith('permissions.getMode', {});
	});

	it('setPermissionMode routes through bridge', async () => {
		invoke.mockResolvedValue({ mode: 'yolo' });
		await expect(setPermissionMode('yolo')).resolves.toBe('yolo');
		expect(invoke).toHaveBeenCalledWith('permissions.setMode', { mode: 'yolo' });
	});
});

// ---------------------------------------------------------------------------
// Suite 3: web fallbacks for privileged ops
// ---------------------------------------------------------------------------

describe('lib/desktop privileged-op wrappers (web fallbacks)', () => {
	beforeEach(() => {
		(window as unknown as { zero?: unknown }).zero = undefined;
	});

	it('listWorkspaceRoots returns []', async () => {
		await expect(listWorkspaceRoots()).resolves.toEqual([]);
	});

	it('readFile returns desktop-only fail envelope', async () => {
		await expect(readFile('/x')).resolves.toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('writeFile returns desktop-only fail envelope', async () => {
		await expect(writeFile('/x', 'content')).resolves.toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('listDirectory returns desktop-only fail envelope', async () => {
		await expect(listDirectory('/x')).resolves.toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('runShell returns desktop-only fail envelope', async () => {
		await expect(runShell({ command: 'ls', cwd: '/x' })).resolves.toEqual({
			ok: false,
			reason: 'desktop-only',
		});
	});

	it('getPermissionMode returns "web"', async () => {
		await expect(getPermissionMode()).resolves.toBe('web');
	});

	it('setPermissionMode returns "web"', async () => {
		await expect(setPermissionMode('default')).resolves.toBe('web');
	});
});

// ---------------------------------------------------------------------------
// Suite 4: NOT-SUPPORTED stubs (push-event ops, always fail regardless of shell)
// ---------------------------------------------------------------------------

describe('lib/desktop NOT-SUPPORTED stubs (streaming / push-event ops)', () => {
	// These should return not-supported whether or not the shell is present,
	// because zero-native has no push-event API yet.

	afterEach(() => {
		(window as unknown as { zero?: unknown }).zero = undefined;
	});

	for (const shellPresent of [false, true]) {
		describe(`shell present = ${shellPresent}`, () => {
			beforeEach(() => {
				if (shellPresent) {
					(window as unknown as { zero: unknown }).zero = { invoke: vi.fn() };
				} else {
					(window as unknown as { zero?: unknown }).zero = undefined;
				}
			});

			it('watchDirectory returns not-supported', async () => {
				await expect(watchDirectory('/x')).resolves.toEqual({
					ok: false,
					reason: 'not-supported',
				});
			});

			it('unwatchDirectory returns not-supported', async () => {
				await expect(unwatchDirectory('id')).resolves.toEqual({
					ok: false,
					reason: 'not-supported',
				});
			});

			it('spawnShellStreaming returns not-supported', async () => {
				await expect(spawnShellStreaming({ command: 'ls', cwd: '/x' })).resolves.toEqual({
					ok: false,
					reason: 'not-supported',
				});
			});

			it('killShellJob returns not-supported', async () => {
				await expect(killShellJob('jobId')).resolves.toEqual({
					ok: false,
					reason: 'not-supported',
				});
			});
		});
	}

	it('onMenuNewChat returns no-op unsubscribe', () => {
		const unsub = onMenuNewChat(() => undefined);
		expect(typeof unsub).toBe('function');
		expect(() => unsub()).not.toThrow();
	});

	it('onFsWatchEvent returns no-op unsubscribe', () => {
		const unsub = onFsWatchEvent(() => undefined);
		expect(typeof unsub).toBe('function');
		expect(() => unsub()).not.toThrow();
	});

	it('onShellStream returns no-op unsubscribe', () => {
		const unsub = onShellStream(() => undefined);
		expect(typeof unsub).toBe('function');
		expect(() => unsub()).not.toThrow();
	});

	it('onShellStreamEnd returns no-op unsubscribe', () => {
		const unsub = onShellStreamEnd(() => undefined);
		expect(typeof unsub).toBe('function');
		expect(() => unsub()).not.toThrow();
	});

	it('onPermissionPrompt returns no-op unsubscribe', () => {
		const unsub = onPermissionPrompt(() => undefined);
		expect(typeof unsub).toBe('function');
		expect(() => unsub()).not.toThrow();
	});

	it('respondToPermissionPrompt is a safe no-op', () => {
		expect(() =>
			respondToPermissionPrompt({ id: 'x', decision: 'allow', scope: 'once' })
		).not.toThrow();
	});
});
