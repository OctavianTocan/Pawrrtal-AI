/**
 * Permission system for Pawrrtal's Electrobun shell.
 *
 * Ported from electron/src/permissions.ts. The security model and
 * state machine are identical. Changes:
 *   - `ipcMain` / `BrowserWindow` → function injection via `setPromptFn`
 *     (the actual Electrobun `win.webview.rpc.send.permissionsPrompt` call
 *     lives in index.ts, keeping this module free of Electrobun imports so
 *     it can be fully exercised in Vitest's node environment).
 *   - `electron-store` → `./store`
 *   - `randomUUID` from node:crypto is the same.
 *
 * The prompt round-trip in Electrobun uses two RPC legs instead of Electron's
 * ipcMain.handle + webContents.send:
 *   bun → webview:  win.webview.rpc.send.permissionsPrompt(request)
 *   webview → bun:  bun.messages.permissionsRespond handler (see index.ts)
 */

import { randomUUID } from 'node:crypto';

import { createStore } from './store';

export type PermissionMode = 'default' | 'accept-edits' | 'yolo' | 'plan';
export type PermissionOp = 'fs:write' | 'shell:run' | 'shell:spawn';
export type PermissionDecision = 'allow' | 'deny';
export type PermissionScope = 'once' | 'session' | 'always';

export interface PromptDetails {
	op: PermissionOp;
	subject: string;
	rootId?: string;
	context?: Record<string, unknown>;
}

interface PromptRequest extends PromptDetails {
	id: string;
}

export interface PromptResponse {
	id: string;
	decision: PermissionDecision;
	scope: PermissionScope;
}

interface PersistedPermissions extends Record<string, unknown> {
	mode: PermissionMode;
	always: Record<string, PermissionDecision>;
}

const permissionsStore = createStore<PersistedPermissions>({
	name: 'permissions',
	defaults: { mode: 'default', always: {} },
});

const sessionDecisions = new Map<string, PermissionDecision>();
const pendingPrompts = new Map<string, (response: PromptResponse) => void>();

const PROMPT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Injected by index.ts after the BrowserWindow is created.
 * Decouples this module from Electrobun's runtime so tests can provide a
 * synchronous stub without needing a display server.
 */
let _sendPrompt: ((request: PromptRequest) => void) | undefined;

export function setPromptFn(fn: (request: PromptRequest) => void): void {
	_sendPrompt = fn;
}

/** Called by the `permissionsRespond` RPC message handler in index.ts. */
export function resolvePrompt(response: PromptResponse): void {
	const resolver = pendingPrompts.get(response.id);
	if (!resolver) return;
	pendingPrompts.delete(response.id);
	resolver(response);
}

export function permissionKey(details: PromptDetails): string {
	const subject = normalizeSubject(details.op, details.subject);
	return `${details.op}|${subject}|${details.rootId ?? '*'}`;
}

function normalizeSubject(op: PermissionOp, subject: string): string {
	if (op === 'shell:run' || op === 'shell:spawn') {
		return subject.trim().split(/\s+/)[0] ?? subject;
	}
	return subject;
}

export async function requestPermission(details: PromptDetails): Promise<PermissionDecision> {
	const mode = permissionsStore.get('mode');
	if (mode === 'yolo') return 'allow';
	if (mode === 'plan') return 'deny';
	if (mode === 'accept-edits' && details.op === 'fs:write') return 'allow';

	const key = permissionKey(details);
	const persistent = permissionsStore.get('always')[key];
	if (persistent) return persistent;
	const session = sessionDecisions.get(key);
	if (session) return session;

	const response = await promptWebview(details);
	if (response.scope === 'session') sessionDecisions.set(key, response.decision);
	if (response.scope === 'always') {
		permissionsStore.set('always', {
			...permissionsStore.get('always'),
			[key]: response.decision,
		});
	}
	return response.decision;
}

export function getMode(): PermissionMode {
	return permissionsStore.get('mode');
}

export function setMode(mode: PermissionMode): PermissionMode {
	permissionsStore.set('mode', mode);
	return mode;
}

function promptWebview(details: PromptDetails): Promise<PromptResponse> {
	const id = randomUUID();
	const request: PromptRequest = { id, ...details };
	if (!_sendPrompt) {
		// No webview wired up yet (e.g. during startup) — default-deny.
		return Promise.resolve({ id, decision: 'deny', scope: 'once' });
	}
	// Register in pendingPrompts BEFORE calling _sendPrompt so that a
	// synchronous resolvePrompt() inside the prompt fn (common in tests)
	// finds the resolver instead of silently discarding it, leaving the
	// PROMPT_TIMEOUT_MS timer open and hanging the process.
	return new Promise<PromptResponse>((resolve) => {
		const timeout = setTimeout(() => {
			pendingPrompts.delete(id);
			resolve({ id, decision: 'deny', scope: 'once' });
		}, PROMPT_TIMEOUT_MS);
		pendingPrompts.set(id, (response) => {
			clearTimeout(timeout);
			resolve(response);
		});
		_sendPrompt!(request);
	});
}

export function _resetForTests(): void {
	sessionDecisions.clear();
	pendingPrompts.clear();
	permissionsStore._resetToDefaults({ mode: 'default', always: {} });
	_sendPrompt = undefined;
}
