/**
 * Tests for the permission ladder.
 *
 * The renderer prompt is mocked out — `mainWindow` is undefined in
 * tests so the prompt path resolves to default-deny synchronously,
 * which lets us exercise the mode + persistent + session decision
 * fast-paths without spinning up a BrowserWindow.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempUserData: string;

vi.mock('electron', () => ({
	app: {
		getPath: () => tempUserData,
		getName: (): string => 'pawrrtal-perms-test',
		getVersion: (): string => '0.0.0-test',
	},
	ipcMain: {
		on: vi.fn(),
		handle: vi.fn(),
	},
}));

/** Loads `permissions` fresh, resets persisted state, and registers IPC with no window (prompts deny). */
async function loadPermissions() {
	vi.resetModules();
	const mod = await import('./permissions');
	mod._resetForTests();
	// Wire registerPermissionIpc once so the underlying handlers exist —
	// pass an undefined window so prompts default-deny instead of hanging.
	mod.registerPermissionIpc(() => undefined);
	return mod;
}

beforeEach(() => {
	tempUserData = mkdtempSync(path.join(os.tmpdir(), 'pawrrtal-perms-'));
});

afterEach(() => {
	rmSync(tempUserData, { recursive: true, force: true });
});

describe('requestPermission — mode pre-decisions', () => {
	it('yolo mode allows everything', async () => {
		const { _resetForTests, requestPermission } = await loadPermissions();
		_resetForTests();
		// Set yolo via the public set-mode handler emulation: write
		// directly via the request path's dependency (the store).
		// Easier: import permissionsStore — but it's not exported.
		// Workaround: drive through the `permissions:set-mode` handler.
		// Since we can't reach it without ipcMain plumbing in tests,
		// we set via the underlying store using the same name.
		const store = (await import('./lib/typed-store')).createStore<{
			mode: string;
			always: Record<string, string>;
		}>({
			name: 'permissions',
			defaults: { mode: 'default', always: {} },
		});
		store.set('mode', 'yolo');

		const decision = await requestPermission({
			op: 'shell:run',
			subject: 'rm -rf /',
			rootId: '/tmp/root',
		});
		expect(decision).toBe('allow');
	});

	it('plan mode denies everything', async () => {
		const { requestPermission } = await loadPermissions();
		const store = (await import('./lib/typed-store')).createStore<{
			mode: string;
			always: Record<string, string>;
		}>({
			name: 'permissions',
			defaults: { mode: 'default', always: {} },
		});
		store.set('mode', 'plan');

		const decision = await requestPermission({
			op: 'fs:write',
			subject: 'note.md',
			rootId: '/tmp/root',
		});
		expect(decision).toBe('deny');
	});

	it('accept-edits mode auto-allows fs:write but not shell:run', async () => {
		const { requestPermission } = await loadPermissions();
		const store = (await import('./lib/typed-store')).createStore<{
			mode: string;
			always: Record<string, string>;
		}>({
			name: 'permissions',
			defaults: { mode: 'default', always: {} },
		});
		store.set('mode', 'accept-edits');

		const writeDecision = await requestPermission({
			op: 'fs:write',
			subject: 'note.md',
			rootId: '/tmp/root',
		});
		expect(writeDecision).toBe('allow');

		// shell:run with no window → default deny
		const shellDecision = await requestPermission({
			op: 'shell:run',
			subject: 'ls',
			rootId: '/tmp/root',
		});
		expect(shellDecision).toBe('deny');
	});
});

describe('permissionKey normalisation', () => {
	it('collapses shell command + args to the executable name', async () => {
		const { permissionKey } = await loadPermissions();
		const a = permissionKey({ op: 'shell:run', subject: 'npm install foo', rootId: '/r' });
		const b = permissionKey({ op: 'shell:run', subject: 'npm install bar baz', rootId: '/r' });
		expect(a).toBe(b);
	});

	it('keeps fs:write subjects whole (filenames matter)', async () => {
		const { permissionKey } = await loadPermissions();
		const a = permissionKey({ op: 'fs:write', subject: 'src/index.ts', rootId: '/r' });
		const b = permissionKey({ op: 'fs:write', subject: 'src/main.ts', rootId: '/r' });
		expect(a).not.toBe(b);
	});

	it('uses different keys for different roots', async () => {
		const { permissionKey } = await loadPermissions();
		const a = permissionKey({ op: 'shell:run', subject: 'npm', rootId: '/a' });
		const b = permissionKey({ op: 'shell:run', subject: 'npm', rootId: '/b' });
		expect(a).not.toBe(b);
	});
});
