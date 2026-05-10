/**
 * Tests for the filesystem IPC handlers.
 *
 * The handlers register themselves on `ipcMain.handle(channel, fn)`;
 * the mock captures the handlers into a map keyed by channel so tests
 * can invoke them directly without spinning up an Electron process.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempUserData: string;
let tempHome: string;
let tempRoot: string;

const ipcHandlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
	app: {
		getPath: (key: string): string => {
			if (key === 'home') return tempHome;
			if (key === 'userData') return tempUserData;
			return tempUserData;
		},
		getName: (): string => 'pawrrtal-fs-test',
		getVersion: (): string => '0.0.0-test',
	},
	ipcMain: {
		handle: (
			channel: string,
			handler: (event: unknown, ...args: unknown[]) => unknown
		): void => {
			ipcHandlers.set(channel, handler);
		},
		on: vi.fn(),
	},
}));

/** Loads workspace + permissions + fs handlers with yolo mode and a temp allowlisted root. */
async function setup() {
	vi.resetModules();
	ipcHandlers.clear();
	const workspace = await import('../workspace');
	const permissions = await import('../permissions');
	const fs = await import('./fs');
	workspace._resetCacheForTests();
	permissions._resetForTests();
	// Yolo so writes don't need a renderer prompt.
	await invoke('permissions:set-mode', 'yolo');
	workspace.addRoot(tempRoot);
	fs.registerFsHandlers({ getWindow: () => undefined });
	permissions.registerPermissionIpc(() => undefined);
	return { workspace, permissions, fs };
}

/**
 * Invokes a registered IPC handler, lazily loading full `ipc` registration when needed
 * (e.g. for `permissions:set-mode`).
 */
async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
	const handler = ipcHandlers.get(channel);
	if (!handler) {
		// Permission/workspace handlers register on first import; if missing
		// we fall through to a registerIpc call inside setup.
		const ipc = await import('../ipc');
		ipc.registerIpcHandlers({ getWindow: () => undefined });
		const after = ipcHandlers.get(channel);
		if (!after) throw new Error(`No handler registered for ${channel}`);
		return (await after(null, ...args)) as T;
	}
	return (await handler(null, ...args)) as T;
}

beforeEach(() => {
	tempUserData = mkdtempSync(path.join(os.tmpdir(), 'pawrrtal-fs-userdata-'));
	tempHome = mkdtempSync(path.join(os.tmpdir(), 'pawrrtal-fs-home-'));
	tempRoot = mkdtempSync(path.join(os.tmpdir(), 'pawrrtal-fs-root-'));
});

afterEach(() => {
	rmSync(tempUserData, { recursive: true, force: true });
	rmSync(tempHome, { recursive: true, force: true });
	rmSync(tempRoot, { recursive: true, force: true });
});

describe('fs:read-file', () => {
	it('reads a file inside an allowlisted root', async () => {
		await setup();
		const target = path.join(tempRoot, 'note.md');
		writeFileSync(target, 'hello\n');
		const result = await invoke<{ ok: true; content: string }>('fs:read-file', target);
		expect(result.ok).toBe(true);
		expect(result.content).toBe('hello\n');
	});

	it('rejects a path outside every root', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('fs:read-file', '/etc/passwd');
		expect(result.ok).toBe(false);
	});

	it('rejects non-string input', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('fs:read-file', 42);
		expect(result.ok).toBe(false);
	});
});

describe('fs:write-file', () => {
	it('writes a file inside an allowlisted root', async () => {
		await setup();
		const target = path.join(tempRoot, 'subdir', 'note.md');
		const result = await invoke<{ ok: true }>('fs:write-file', target, 'hi');
		expect(result.ok).toBe(true);
		const { readFileSync } = await import('node:fs');
		expect(readFileSync(target, 'utf8')).toBe('hi');
	});

	it('rejects a write outside every root', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>(
			'fs:write-file',
			'/tmp/escape.txt',
			'nope'
		);
		expect(result.ok).toBe(false);
	});

	it('rejects when content is not a string', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>(
			'fs:write-file',
			path.join(tempRoot, 'x.md'),
			42
		);
		expect(result.ok).toBe(false);
	});
});

describe('fs:list-directory', () => {
	it('returns dir entries with isDirectory + size + modifiedAt', async () => {
		await setup();
		mkdirSync(path.join(tempRoot, 'src'));
		writeFileSync(path.join(tempRoot, 'README.md'), 'hi');
		const result = await invoke<{
			ok: true;
			entries: Array<{ name: string; isDirectory: boolean }>;
		}>('fs:list-directory', tempRoot);
		expect(result.ok).toBe(true);
		const names = result.entries.map((e) => e.name).sort();
		expect(names).toEqual(['README.md', 'src']);
		const dir = result.entries.find((e) => e.name === 'src');
		expect(dir?.isDirectory).toBe(true);
	});

	it('rejects a path outside every root', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('fs:list-directory', '/etc');
		expect(result.ok).toBe(false);
	});
});

describe('fs:watch-directory + fs:unwatch', () => {
	it('returns a watch id and accepts unwatch', async () => {
		await setup();
		const watch = await invoke<{ ok: true; id: string }>('fs:watch-directory', tempRoot);
		expect(watch.ok).toBe(true);
		expect(typeof watch.id).toBe('string');
		const unwatch = await invoke<{ ok: true }>('fs:unwatch', watch.id);
		expect(unwatch.ok).toBe(true);
	});

	it('unwatch is idempotent for unknown ids', async () => {
		await setup();
		const result = await invoke<{ ok: true }>('fs:unwatch', 'nope');
		expect(result.ok).toBe(true);
	});
});
