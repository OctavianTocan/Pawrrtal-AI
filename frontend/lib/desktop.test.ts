import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getDesktopVersion,
	getPlatform,
	isDesktop,
	onMenuNewChat,
	openExternal,
	showOpenFolderDialog,
} from './desktop';

describe('lib/desktop (web shell — no aiNexus bridge)', () => {
	beforeEach(() => {
		// Make sure no other test left an injected bridge behind.
		(window as unknown as { aiNexus?: unknown }).aiNexus = undefined;
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
		(window as unknown as { aiNexus: unknown }).aiNexus = {
			openExternal: vi.fn().mockResolvedValue(undefined),
			showOpenFolderDialog: vi.fn().mockResolvedValue('/Users/me/Code'),
			getPlatform: vi.fn().mockResolvedValue('darwin' as NodeJS.Platform),
			getVersion: vi.fn().mockResolvedValue('0.1.0'),
			onMenuNewChat: vi.fn().mockReturnValue(() => undefined),
		};
	});
	afterEach(() => {
		(window as unknown as { aiNexus?: unknown }).aiNexus = undefined;
	});

	it('reports the app is running on desktop', () => {
		expect(isDesktop()).toBe(true);
	});

	it('routes openExternal through the bridge', async () => {
		await openExternal('https://example.com');
		const bridge = (
			window as unknown as { aiNexus: { openExternal: ReturnType<typeof vi.fn> } }
		).aiNexus;
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
