/**
 * Smoke tests for the workspace IPC channels — list/add/remove are
 * thin wrappers around the workspace module but they're the
 * user-driven mutation points so they need to round-trip through the
 * IPC contract.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempUserData: string;
let tempHome: string;
let tempDir: string;

const ipcHandlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
	app: {
		getPath: (key: string): string => {
			if (key === 'home') return tempHome;
			if (key === 'userData') return tempUserData;
			return tempUserData;
		},
		getName: (): string => 'ai-nexus-ipc-test',
		getVersion: (): string => '0.0.0-test',
	},
	BrowserWindow: vi.fn(() => ({ isDestroyed: () => false })),
	dialog: { showOpenDialog: vi.fn() },
	ipcMain: {
		handle: (
			channel: string,
			handler: (event: unknown, ...args: unknown[]) => unknown
		): void => {
			ipcHandlers.set(channel, handler);
		},
		on: vi.fn(),
	},
	shell: { openExternal: vi.fn() },
}));

/** Resets IPC mocks and workspace cache, then registers handlers under test. */
async function setup() {
	vi.resetModules();
	ipcHandlers.clear();
	const workspace = await import('./workspace');
	const ipc = await import('./ipc');
	workspace._resetCacheForTests();
	ipc.registerIpcHandlers({ getWindow: () => undefined });
	return workspace;
}

/** Invokes a captured `ipcMain.handle` callback by channel name (test harness). */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
	const handler = ipcHandlers.get(channel);
	if (!handler) throw new Error(`No handler registered for ${channel}`);
	return (await handler(null, ...args)) as T;
}

beforeEach(() => {
	tempUserData = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-ipc-userdata-'));
	tempHome = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-ipc-home-'));
	tempDir = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-ipc-target-'));
});

afterEach(() => {
	rmSync(tempUserData, { recursive: true, force: true });
	rmSync(tempHome, { recursive: true, force: true });
	rmSync(tempDir, { recursive: true, force: true });
});

describe('workspace IPC channels', () => {
	it('list-roots returns the current allowlist', async () => {
		await setup();
		const roots = await invoke<string[]>('workspace:list-roots');
		expect(Array.isArray(roots)).toBe(true);
	});

	it('add-root with an explicit path appends to the allowlist', async () => {
		await setup();
		const result = await invoke<string[]>('workspace:add-root', tempDir);
		expect(result).toContain(tempDir);
	});

	it('remove-root drops the entry', async () => {
		await setup();
		await invoke<string[]>('workspace:add-root', tempDir);
		const after = await invoke<string[]>('workspace:remove-root', tempDir);
		expect(after).not.toContain(tempDir);
	});

	it('remove-root returns the current list when given a non-string', async () => {
		await setup();
		const result = await invoke<string[]>('workspace:remove-root', 42);
		expect(Array.isArray(result)).toBe(true);
	});
});

describe('desktop IPC channels', () => {
	it('desktop:get-platform returns process.platform', async () => {
		await setup();
		const platform = await invoke<NodeJS.Platform>('desktop:get-platform');
		expect(platform).toBe(process.platform);
	});

	it('desktop:get-version returns the mocked version', async () => {
		await setup();
		const version = await invoke<string>('desktop:get-version');
		expect(version).toBe('0.0.0-test');
	});

	it('desktop:open-external rejects non-http(s) URLs', async () => {
		const { shell } = await import('electron');
		await setup();
		await invoke('desktop:open-external', 'file:///etc/passwd');
		expect(vi.mocked(shell.openExternal)).not.toHaveBeenCalled();
	});

	it('desktop:open-external rejects non-string input', async () => {
		const { shell } = await import('electron');
		vi.mocked(shell.openExternal).mockClear();
		await setup();
		await invoke('desktop:open-external', 42);
		expect(vi.mocked(shell.openExternal)).not.toHaveBeenCalled();
	});
});
