/**
 * Tests for the shell IPC handlers.
 *
 * Spawns real shell commands (`echo`, `false`) into a tempdir so the
 * full pipeline runs, including the path validation + permission gate.
 * `permissions:set-mode` is flipped to `yolo` in setup so the prompt
 * path doesn't need a renderer.
 */

import { mkdtempSync, rmSync } from 'node:fs';
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
		getName: (): string => 'ai-nexus-shell-test',
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

async function setup() {
	vi.resetModules();
	ipcHandlers.clear();
	const workspace = await import('../workspace');
	const permissions = await import('../permissions');
	const shell = await import('./shell');
	workspace._resetCacheForTests();
	permissions._resetForTests();
	const ipc = await import('../ipc');
	ipc.registerIpcHandlers({ getWindow: () => undefined });
	shell.registerShellHandlers({ getWindow: () => undefined });
	permissions.registerPermissionIpc(() => undefined);
	workspace.addRoot(tempRoot);
	await invoke('permissions:set-mode', 'yolo');
}

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
	const handler = ipcHandlers.get(channel);
	if (!handler) throw new Error(`No handler registered for ${channel}`);
	return (await handler(null, ...args)) as T;
}

beforeEach(() => {
	tempUserData = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-shell-userdata-'));
	tempHome = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-shell-home-'));
	tempRoot = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-shell-root-'));
});

afterEach(() => {
	rmSync(tempUserData, { recursive: true, force: true });
	rmSync(tempHome, { recursive: true, force: true });
	rmSync(tempRoot, { recursive: true, force: true });
});

describe('shell:run', () => {
	it('runs echo and returns stdout + exit code 0', async () => {
		await setup();
		const result = await invoke<{
			ok: true;
			stdout: string;
			stderr: string;
			exitCode: number | null;
		}>('shell:run', { command: 'echo', args: ['hello'], cwd: tempRoot });
		expect(result.ok).toBe(true);
		expect(result.stdout.trim()).toBe('hello');
		expect(result.exitCode).toBe(0);
	});

	it('captures non-zero exit codes without erroring', async () => {
		await setup();
		const result = await invoke<{ ok: true; exitCode: number | null }>('shell:run', {
			command: 'false',
			cwd: tempRoot,
		});
		expect(result.ok).toBe(true);
		expect(result.exitCode).not.toBe(0);
	});

	it('rejects when cwd is outside every root', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('shell:run', {
			command: 'echo',
			cwd: '/etc',
		});
		expect(result.ok).toBe(false);
	});

	it('rejects when command is missing', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('shell:run', {
			cwd: tempRoot,
		});
		expect(result.ok).toBe(false);
	});

	it('rejects when request is not an object', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('shell:run', 42);
		expect(result.ok).toBe(false);
	});

	it('respects a custom timeout (kills the child)', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('shell:run', {
			command: 'sleep',
			args: ['5'],
			cwd: tempRoot,
			timeoutMs: 100,
		});
		expect(result.ok).toBe(false);
		expect(result.reason).toMatch(/timeout/i);
	});
});

describe('shell:kill', () => {
	it('returns ok for an unknown jobId (idempotent)', async () => {
		await setup();
		const result = await invoke<{ ok: true }>('shell:kill', 'nope');
		expect(result.ok).toBe(true);
	});

	it('rejects non-string input', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('shell:kill', 42);
		expect(result.ok).toBe(false);
	});
});

describe('shell:spawn-streaming', () => {
	it('rejects when no window is available to stream to', async () => {
		await setup();
		const result = await invoke<{ ok: false; reason: string }>('shell:spawn-streaming', {
			command: 'echo',
			args: ['hi'],
			cwd: tempRoot,
		});
		expect(result.ok).toBe(false);
		expect(result.reason).toMatch(/window/i);
	});
});
