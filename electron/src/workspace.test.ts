/**
 * Tests for the workspace allowlist + path validator.
 *
 * Uses a temp directory tree per test so the persisted electron-store
 * (under userData) doesn't carry state between cases. We mock
 * `electron.app.getPath('userData')` to point at the temp dir.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tempUserData: string;
let tempHome: string;

vi.mock('electron', () => ({
	app: {
		getPath: (key: string): string => {
			if (key === 'home') return tempHome;
			if (key === 'userData') return tempUserData;
			return tempUserData;
		},
		getName: (): string => 'ai-nexus-workspace-test',
		getVersion: (): string => '0.0.0-test',
	},
}));

/** Dynamically imports `workspace` after resetting Vitest modules and the roots cache. */
async function loadWorkspace() {
	vi.resetModules();
	const mod = await import('./workspace');
	mod._resetCacheForTests();
	return mod;
}

beforeEach(() => {
	tempUserData = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-userdata-'));
	tempHome = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-home-'));
});

afterEach(() => {
	rmSync(tempUserData, { recursive: true, force: true });
	rmSync(tempHome, { recursive: true, force: true });
});

describe('ensureDefaultWorkspaceRoot', () => {
	it('creates ~/AI-Nexus-Workspace and registers it as the only root', async () => {
		const { ensureDefaultWorkspaceRoot, listRoots } = await loadWorkspace();
		ensureDefaultWorkspaceRoot();
		const roots = listRoots();
		expect(roots).toHaveLength(1);
		expect(roots[0]).toContain('AI-Nexus-Workspace');
	});

	it('is idempotent across calls', async () => {
		const { ensureDefaultWorkspaceRoot, listRoots } = await loadWorkspace();
		ensureDefaultWorkspaceRoot();
		ensureDefaultWorkspaceRoot();
		expect(listRoots()).toHaveLength(1);
	});

	it('does not overwrite a user-configured set of roots', async () => {
		const { ensureDefaultWorkspaceRoot, addRoot, listRoots } = await loadWorkspace();
		const customRoot = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-custom-'));
		try {
			ensureDefaultWorkspaceRoot();
			addRoot(customRoot);
			ensureDefaultWorkspaceRoot();
			expect(listRoots()).toContain(customRoot);
		} finally {
			rmSync(customRoot, { recursive: true, force: true });
		}
	});
});

describe('addRoot / removeRoot', () => {
	it('adds a new root and dedupes on repeat add', async () => {
		const { addRoot, listRoots } = await loadWorkspace();
		const target = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-add-'));
		try {
			addRoot(target);
			addRoot(target);
			expect(listRoots().filter((r) => r === target)).toHaveLength(1);
		} finally {
			rmSync(target, { recursive: true, force: true });
		}
	});

	it('removes a root cleanly and is idempotent on absent entries', async () => {
		const { addRoot, removeRoot, listRoots } = await loadWorkspace();
		const target = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-rm-'));
		try {
			addRoot(target);
			removeRoot(target);
			removeRoot(target);
			expect(listRoots()).not.toContain(target);
		} finally {
			rmSync(target, { recursive: true, force: true });
		}
	});
});

describe('validateFilePath', () => {
	it('rejects when no roots configured', async () => {
		const { validateFilePath } = await loadWorkspace();
		const result = validateFilePath('/tmp/anywhere');
		expect(result.ok).toBe(false);
	});

	it('accepts a path inside an allowlisted root', async () => {
		const { addRoot, validateFilePath } = await loadWorkspace();
		const { realpathSync } = await import('node:fs');
		const root = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-ok-'));
		try {
			addRoot(root);
			const target = path.join(root, 'subdir', 'note.md');
			const result = validateFilePath(target);
			expect(result.ok).toBe(true);
			if (result.ok) {
				// macOS resolves /tmp -> /private/tmp via realpath; compare
				// against the realpath of the root, not the literal mkdtemp
				// return value.
				expect(result.root).toBe(realpathSync(root));
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('rejects a path outside every allowlisted root', async () => {
		const { addRoot, validateFilePath } = await loadWorkspace();
		const root = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-out-'));
		try {
			addRoot(root);
			const result = validateFilePath('/etc/passwd');
			expect(result.ok).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('rejects a `..` traversal attempt that escapes the root', async () => {
		const { addRoot, validateFilePath } = await loadWorkspace();
		const root = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-trav-'));
		try {
			addRoot(root);
			const result = validateFilePath(path.join(root, '..', '..', 'etc', 'passwd'));
			expect(result.ok).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('rejects a symlink inside the root that points outside', async () => {
		const { addRoot, validateFilePath } = await loadWorkspace();
		const root = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-sym-'));
		const outside = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-out-'));
		const escapeTarget = path.join(outside, 'secret.txt');
		writeFileSync(escapeTarget, 'hi');
		const symlinkPath = path.join(root, 'leak');
		try {
			addRoot(root);
			symlinkSync(outside, symlinkPath);
			const result = validateFilePath(path.join(symlinkPath, 'secret.txt'));
			expect(result.ok).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
			rmSync(outside, { recursive: true, force: true });
		}
	});

	it('handles a write to a not-yet-existing file inside an existing root subdir', async () => {
		const { addRoot, validateFilePath } = await loadWorkspace();
		const root = mkdtempSync(path.join(os.tmpdir(), 'ai-nexus-newfile-'));
		try {
			mkdirSync(path.join(root, 'src'));
			addRoot(root);
			const result = validateFilePath(path.join(root, 'src', 'newfile.ts'));
			expect(result.ok).toBe(true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('rejects empty + non-string input', async () => {
		const { validateFilePath } = await loadWorkspace();
		expect(validateFilePath('').ok).toBe(false);
		// @ts-expect-error testing runtime guard
		expect(validateFilePath(null).ok).toBe(false);
	});
});
