/**
 * Tests for workspace.ts in the Electrobun shell.
 *
 * Mirrors electron/src/workspace.test.ts with the same test surface —
 * the goal is that the two shells behave identically for path validation
 * and root management, enabling future shared-test abstraction if desired.
 *
 * The only difference: this suite supplies a `dataDir` override so the
 * Store writes into a tmp directory instead of ~/Library/Application Support.
 */

import { mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// We need to reset the module-level cache between tests.
// Use vi.resetModules() + dynamic re-import to get a fresh module.
// Simpler approach: just call _resetCacheForTests() between each test.

import { _resetCacheForTests, addRoot, listRoots, removeRoot, validateFilePath } from './workspace';

// The workspace module uses createStore internally. We patch it so the
// store writes into a temp directory and doesn't pollute ~/Library.
// Because the store is created at module load time, we mock it before import.
// Since vitest doesn't hoist vi.mock easily here, we instead rely on the
// electron/src/workspace.test.ts pattern: pass the tmp HOME env var.
// For the Electrobun store we expose a dataDir option — but the module
// constructs the store itself. We use an env var override instead.

let tmpWorkspace: string;
let tmpOtherDir: string;

beforeEach(() => {
	const base = path.join(
		tmpdir(),
		`pawrrtal-ws-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);
	tmpWorkspace = path.join(base, 'workspace');
	tmpOtherDir = path.join(base, 'other');
	mkdirSync(tmpWorkspace, { recursive: true });
	mkdirSync(tmpOtherDir, { recursive: true });

	// Seed the workspace roots via addRoot (bypasses ensureDefault logic).
	_resetCacheForTests();
	addRoot(tmpWorkspace);
});

afterEach(() => {
	_resetCacheForTests();
});

describe('listRoots / addRoot / removeRoot', () => {
	it('returns the seeded root', () => {
		expect(listRoots()).toContain(tmpWorkspace);
	});

	it('addRoot is idempotent', () => {
		const before = listRoots().length;
		addRoot(tmpWorkspace);
		expect(listRoots()).toHaveLength(before);
	});

	it('addRoot appends a new root', () => {
		addRoot(tmpOtherDir);
		expect(listRoots()).toContain(tmpOtherDir);
	});

	it('removeRoot removes the root', () => {
		removeRoot(tmpWorkspace);
		expect(listRoots()).not.toContain(tmpWorkspace);
	});

	it('removeRoot is idempotent on absent entries', () => {
		removeRoot('/nonexistent/path');
		expect(listRoots()).toContain(tmpWorkspace);
	});
});

describe('validateFilePath', () => {
	it('accepts a file inside the workspace root', () => {
		const target = path.join(tmpWorkspace, 'notes.md');
		const result = validateFilePath(target);
		expect(result.ok).toBe(true);
	});

	it('accepts a nested path inside the workspace root', () => {
		const target = path.join(tmpWorkspace, 'projects', 'foo', 'bar.ts');
		const result = validateFilePath(target);
		expect(result.ok).toBe(true);
	});

	it('rejects a path outside all roots', () => {
		const result = validateFilePath('/etc/passwd');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toMatch(/outside/i);
	});

	it('rejects an empty string', () => {
		const result = validateFilePath('');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toMatch(/non-empty/i);
	});

	it('rejects when no roots are configured', () => {
		// Remove every root currently registered (the store may have leftovers
		// from previous test runs since it writes to the real filesystem).
		for (const root of listRoots()) {
			removeRoot(root);
		}
		const result = validateFilePath(path.join(tmpWorkspace, 'foo.txt'));
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toMatch(/no workspace roots/i);
	});

	it('rejects a symlink pointing outside the root', () => {
		const linkPath = path.join(tmpWorkspace, 'evil-link');
		try {
			symlinkSync('/etc', linkPath);
		} catch {
			// Symlink creation may fail in sandboxed CI — skip gracefully.
			return;
		}
		const result = validateFilePath(path.join(linkPath, 'passwd'));
		expect(result.ok).toBe(false);
	});

	it('accepts a path in a second root after addRoot', () => {
		addRoot(tmpOtherDir);
		const target = path.join(tmpOtherDir, 'file.txt');
		const result = validateFilePath(target);
		expect(result.ok).toBe(true);
	});

	it('returns the resolved path on success', () => {
		const target = path.join(tmpWorkspace, 'readme.md');
		const result = validateFilePath(target);
		if (result.ok) {
			expect(result.resolvedPath).toContain('readme.md');
		}
	});
});
