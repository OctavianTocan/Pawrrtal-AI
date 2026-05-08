import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getDesktopVersion,
	getPlatform,
	isDesktop,
	onMenuNewChat,
	openExternal,
	showOpenFolderDialog,
} from './desktop';

describe('lib/desktop (web shell — no pawrrtal bridge)', () => {
	beforeEach(() => {
		// Make sure no other test left an injected bridge behind.
		(window as unknown as { pawrrtal?: unknown }).pawrrtal = undefined;
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
		// Should not throw when invoked.
		expect(() => unsubscribe()).not.toThrow();
	});
});

describe('lib/desktop (Electron shell — bridge present)', () => {
	beforeEach(() => {
		(window as unknown as { pawrrtal: unknown }).pawrrtal = {
			openExternal: vi.fn().mockResolvedValue(undefined),
			showOpenFolderDialog: vi.fn().mockResolvedValue('/Users/me/Code'),
			getPlatform: vi.fn().mockResolvedValue('darwin' as NodeJS.Platform),
			getVersion: vi.fn().mockResolvedValue('0.1.0'),
			onMenuNewChat: vi.fn().mockReturnValue(() => undefined),
		};
	});
	afterEach(() => {
		(window as unknown as { pawrrtal?: unknown }).pawrrtal = undefined;
	});

	it('reports the app is running on desktop', () => {
		expect(isDesktop()).toBe(true);
	});

	it('routes openExternal through the bridge', async () => {
		await openExternal('https://example.com');
		const bridge = (
			window as unknown as { pawrrtal: { openExternal: ReturnType<typeof vi.fn> } }
		).pawrrtal;
		expect(bridge.openExternal).toHaveBeenCalledWith('https://example.com');
	});

	it('returns the bridge result for showOpenFolderDialog', async () => {
		await expect(showOpenFolderDialog()).resolves.toBe('/Users/me/Code');
	});

	it('returns the platform reported by the bridge', async () => {
		await expect(getPlatform()).resolves.toBe('darwin');
	});

	it('returns the version reported by the bridge', async () => {
		await expect(getDesktopVersion()).resolves.toBe('0.1.0');
	});
});

describe('lib/desktop privileged-op wrappers (web fallbacks)', () => {
	beforeEach(() => {
		(window as unknown as { pawrrtal?: unknown }).pawrrtal = undefined;
	});

	it('listWorkspaceRoots returns []', async () => {
		const { listWorkspaceRoots } = await import('./desktop');
		await expect(listWorkspaceRoots()).resolves.toEqual([]);
	});

	it('addWorkspaceRoot returns []', async () => {
		const { addWorkspaceRoot } = await import('./desktop');
		await expect(addWorkspaceRoot('/x')).resolves.toEqual([]);
	});

	it('removeWorkspaceRoot returns []', async () => {
		const { removeWorkspaceRoot } = await import('./desktop');
		await expect(removeWorkspaceRoot('/x')).resolves.toEqual([]);
	});

	it('readFile returns desktop-only fail envelope', async () => {
		const { readFile } = await import('./desktop');
		const result = await readFile('/x');
		expect(result).toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('writeFile returns desktop-only fail envelope', async () => {
		const { writeFile } = await import('./desktop');
		const result = await writeFile('/x', 'content');
		expect(result).toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('listDirectory returns desktop-only fail envelope', async () => {
		const { listDirectory } = await import('./desktop');
		const result = await listDirectory('/x');
		expect(result).toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('runShell returns desktop-only fail envelope', async () => {
		const { runShell } = await import('./desktop');
		const result = await runShell({ command: 'ls', cwd: '/x' });
		expect(result).toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('spawnShellStreaming returns desktop-only fail envelope', async () => {
		const { spawnShellStreaming } = await import('./desktop');
		const result = await spawnShellStreaming({ command: 'ls', cwd: '/x' });
		expect(result).toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('killShellJob returns desktop-only fail envelope', async () => {
		const { killShellJob } = await import('./desktop');
		const result = await killShellJob('jobId');
		expect(result).toEqual({ ok: false, reason: 'desktop-only' });
	});

	it('watchDirectory + unwatchDirectory return desktop-only fail envelope', async () => {
		const { watchDirectory, unwatchDirectory } = await import('./desktop');
		await expect(watchDirectory('/x')).resolves.toEqual({ ok: false, reason: 'desktop-only' });
		await expect(unwatchDirectory('id')).resolves.toEqual({
			ok: false,
			reason: 'desktop-only',
		});
	});

	it('onFsWatchEvent + onShellStream + onShellStreamEnd + onPermissionPrompt return no-op unsubscribers', async () => {
		const { onFsWatchEvent, onShellStream, onShellStreamEnd, onPermissionPrompt } =
			await import('./desktop');
		const unsubs = [
			onFsWatchEvent(() => undefined),
			onShellStream(() => undefined),
			onShellStreamEnd(() => undefined),
			onPermissionPrompt(() => undefined),
		];
		for (const u of unsubs) {
			expect(typeof u).toBe('function');
			expect(() => u()).not.toThrow();
		}
	});

	it('getPermissionMode returns "web"', async () => {
		const { getPermissionMode } = await import('./desktop');
		await expect(getPermissionMode()).resolves.toBe('web');
	});

	it('setPermissionMode returns "web"', async () => {
		const { setPermissionMode } = await import('./desktop');
		await expect(setPermissionMode('default')).resolves.toBe('web');
	});

	it('respondToPermissionPrompt is a safe no-op on web', async () => {
		const { respondToPermissionPrompt } = await import('./desktop');
		expect(() =>
			respondToPermissionPrompt({ id: 'x', decision: 'allow', scope: 'once' })
		).not.toThrow();
	});
});

describe('lib/desktop privileged-op wrappers (Electron bridge present)', () => {
	beforeEach(() => {
		(window as unknown as { pawrrtal: unknown }).pawrrtal = {
			openExternal: vi.fn(),
			showOpenFolderDialog: vi.fn(),
			getPlatform: vi.fn(),
			getVersion: vi.fn(),
			onMenuNewChat: vi.fn(),
			workspace: {
				listRoots: vi.fn().mockResolvedValue(['/Users/me/Code']),
				addRoot: vi.fn().mockResolvedValue(['/Users/me/Code', '/Users/me/Other']),
				removeRoot: vi.fn().mockResolvedValue(['/Users/me/Code']),
			},
			fs: {
				readFile: vi.fn().mockResolvedValue({ ok: true, content: 'hello' }),
				writeFile: vi.fn().mockResolvedValue({ ok: true }),
				listDirectory: vi.fn().mockResolvedValue({ ok: true, entries: [] }),
				watchDirectory: vi.fn().mockResolvedValue({ ok: true, id: 'w1' }),
				unwatch: vi.fn().mockResolvedValue({ ok: true }),
				onWatchEvent: vi.fn().mockReturnValue(() => undefined),
			},
			shell: {
				run: vi
					.fn()
					.mockResolvedValue({ ok: true, stdout: 'hi\n', stderr: '', exitCode: 0 }),
				spawnStreaming: vi.fn().mockResolvedValue({ ok: true, jobId: 'j1' }),
				kill: vi.fn().mockResolvedValue({ ok: true }),
				onStream: vi.fn().mockReturnValue(() => undefined),
				onStreamEnd: vi.fn().mockReturnValue(() => undefined),
			},
			permissions: {
				getMode: vi.fn().mockResolvedValue('default'),
				setMode: vi.fn().mockResolvedValue('yolo'),
				respond: vi.fn(),
				onPrompt: vi.fn().mockReturnValue(() => undefined),
			},
		};
	});
	afterEach(() => {
		(window as unknown as { pawrrtal?: unknown }).pawrrtal = undefined;
	});

	it('listWorkspaceRoots routes through bridge', async () => {
		const { listWorkspaceRoots } = await import('./desktop');
		await expect(listWorkspaceRoots()).resolves.toEqual(['/Users/me/Code']);
	});

	it('readFile routes through bridge', async () => {
		const { readFile } = await import('./desktop');
		await expect(readFile('/x')).resolves.toEqual({ ok: true, content: 'hello' });
	});

	it('runShell routes through bridge', async () => {
		const { runShell } = await import('./desktop');
		const result = await runShell({ command: 'echo', cwd: '/x' });
		expect(result).toEqual({ ok: true, stdout: 'hi\n', stderr: '', exitCode: 0 });
	});

	it('getPermissionMode routes through bridge', async () => {
		const { getPermissionMode } = await import('./desktop');
		await expect(getPermissionMode()).resolves.toBe('default');
	});

	it('setPermissionMode routes through bridge', async () => {
		const { setPermissionMode } = await import('./desktop');
		await expect(setPermissionMode('yolo')).resolves.toBe('yolo');
	});
});
