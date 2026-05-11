/**
 * Tests for permissions.ts in the Electrobun shell.
 *
 * Mirrors the Electron shell's permissions.test.ts. The state machine
 * is identical; what changed is how the prompt is wired (setPromptFn
 * instead of ipcMain + BrowserWindow), making tests simpler because we
 * can inject a synchronous resolver without mocking Electron modules.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	_resetForTests,
	getMode,
	permissionKey,
	requestPermission,
	resolvePrompt,
	setMode,
	setPromptFn,
	type PermissionDecision,
	type PromptDetails,
} from './permissions';

beforeEach(() => {
	_resetForTests();
});

afterEach(() => {
	_resetForTests();
});

// ─── Mode-driven fast paths ──────────────────────────────────────────────────

describe('mode: yolo', () => {
	it('allows everything without prompting', async () => {
		setMode('yolo');
		const promptFn = vi.fn();
		setPromptFn(promptFn);

		const result = await requestPermission({ op: 'shell:run', subject: 'rm -rf /' });
		expect(result).toBe('allow');
		expect(promptFn).not.toHaveBeenCalled();
	});
});

describe('mode: plan', () => {
	it('denies everything without prompting', async () => {
		setMode('plan');
		const promptFn = vi.fn();
		setPromptFn(promptFn);

		const result = await requestPermission({ op: 'fs:write', subject: 'notes.md' });
		expect(result).toBe('deny');
		expect(promptFn).not.toHaveBeenCalled();
	});
});

describe('mode: accept-edits', () => {
	it('allows fs:write without prompting', async () => {
		setMode('accept-edits');
		const promptFn = vi.fn();
		setPromptFn(promptFn);

		const result = await requestPermission({ op: 'fs:write', subject: 'file.md' });
		expect(result).toBe('allow');
		expect(promptFn).not.toHaveBeenCalled();
	});

	it('still prompts for shell:run', async () => {
		setMode('accept-edits');
		setPromptFn((req) => {
			// Immediately resolve the pending prompt.
			resolvePrompt({ id: req.id, decision: 'allow', scope: 'once' });
		});
		const result = await requestPermission({ op: 'shell:run', subject: 'npm install' });
		expect(result).toBe('allow');
	});
});

// ─── Prompt round-trip ───────────────────────────────────────────────────────

describe('prompt round-trip (default mode)', () => {
	it('resolves to allow when the webview replies allow', async () => {
		setPromptFn((req) => {
			resolvePrompt({ id: req.id, decision: 'allow', scope: 'once' });
		});
		const result = await requestPermission({ op: 'shell:run', subject: 'git status' });
		expect(result).toBe('allow');
	});

	it('resolves to deny when the webview replies deny', async () => {
		setPromptFn((req) => {
			resolvePrompt({ id: req.id, decision: 'deny', scope: 'once' });
		});
		const result = await requestPermission({ op: 'fs:write', subject: 'secret.txt' });
		expect(result).toBe('deny');
	});

	it('default-denies when no prompt fn is registered', async () => {
		// _resetForTests clears _sendPrompt, so no fn is set.
		const result = await requestPermission({ op: 'fs:write', subject: 'foo.txt' });
		expect(result).toBe('deny');
	});
});

// ─── Session decisions ───────────────────────────────────────────────────────

describe('scope: session', () => {
	it('skips prompt for the same key after a session-scoped allow', async () => {
		let callCount = 0;
		setPromptFn((req) => {
			callCount++;
			resolvePrompt({ id: req.id, decision: 'allow', scope: 'session' });
		});

		await requestPermission({ op: 'shell:run', subject: 'npm install' });
		await requestPermission({ op: 'shell:run', subject: 'npm install' });

		expect(callCount).toBe(1); // second call served from session cache
	});

	it('still prompts for a different subject after session-scoped allow', async () => {
		let callCount = 0;
		setPromptFn((req) => {
			callCount++;
			resolvePrompt({ id: req.id, decision: 'allow', scope: 'session' });
		});

		await requestPermission({ op: 'shell:run', subject: 'npm install' });
		await requestPermission({ op: 'shell:run', subject: 'git push' });

		expect(callCount).toBe(2);
	});
});

// ─── permissionKey ───────────────────────────────────────────────────────────

describe('permissionKey', () => {
	it('normalises shell commands to the first token', () => {
		const a = permissionKey({ op: 'shell:run', subject: 'npm install foo' });
		const b = permissionKey({ op: 'shell:run', subject: 'npm install bar' });
		expect(a).toBe(b);
	});

	it('does not normalise fs:write subjects', () => {
		const a = permissionKey({ op: 'fs:write', subject: 'foo/bar.md' });
		const b = permissionKey({ op: 'fs:write', subject: 'foo/baz.md' });
		expect(a).not.toBe(b);
	});

	it('includes rootId in the key', () => {
		const a = permissionKey({ op: 'fs:write', subject: 'file.md', rootId: '/workspace/a' });
		const b = permissionKey({ op: 'fs:write', subject: 'file.md', rootId: '/workspace/b' });
		expect(a).not.toBe(b);
	});
});

// ─── getMode / setMode ───────────────────────────────────────────────────────

describe('getMode / setMode', () => {
	it('defaults to "default"', () => {
		expect(getMode()).toBe('default');
	});

	it('round-trips all valid modes', () => {
		for (const mode of ['default', 'accept-edits', 'yolo', 'plan'] as const) {
			setMode(mode);
			expect(getMode()).toBe(mode);
		}
	});
});
