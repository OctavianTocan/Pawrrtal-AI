/**
 * Permission system for desktop privileged ops.
 *
 * Mirrors the permission ladder Claude Code uses:
 *   - **default**     — prompt on every privileged op until the user
 *                       picks "Always allow"; subsequent same-key ops
 *                       run without a prompt.
 *   - **accept-edits** — file writes auto-allowed; shell still prompts.
 *   - **yolo**         — everything auto-allowed (use with care).
 *   - **plan**         — read-only; every write/exec denied without a
 *                       prompt, so the agent can think but not act.
 *
 * Per-op decisions are keyed `<op>:<command-or-write>:<root-id>` so a
 * "Always allow `npm install` in ~/AI-Nexus-Workspace" decision
 * doesn't leak into a different workspace root.
 *
 * The actual prompt UI lives in the renderer — main process forwards
 * the request via `webContents.send('permissions:prompt', { id, ...
 * details })`, the FE renders a modal, the user responds, the FE POSTs
 * back via `permissions:respond`. A pending promise on the main side
 * resolves when the response arrives. Timeout: 5 minutes (then
 * default-deny so a forgotten prompt doesn't hang an agent forever).
 */

import { randomUUID } from 'node:crypto';
import { type BrowserWindow, ipcMain } from 'electron';

import { createStore } from './lib/typed-store';

export type PermissionMode = 'default' | 'accept-edits' | 'yolo' | 'plan';

export type PermissionOp = 'fs:write' | 'shell:run' | 'shell:spawn';

export type PermissionDecision = 'allow' | 'deny';

export type PermissionScope = 'once' | 'session' | 'always';

interface PromptDetails {
	op: PermissionOp;
	/** Human-readable label rendered in the prompt (filename, command). */
	subject: string;
	/** Resolved workspace root the op targets, used for the persistent key. */
	rootId?: string;
	/** Free-form additional context (cwd, args, file size). */
	context?: Record<string, unknown>;
}

interface PromptRequest extends PromptDetails {
	id: string;
}

interface PromptResponse {
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

/** In-memory session decisions — cleared on app restart. */
const sessionDecisions = new Map<string, PermissionDecision>();

/** Pending prompts awaiting renderer response. */
const pendingPrompts = new Map<string, (response: PromptResponse) => void>();

/** Default timeout (ms) before an unanswered prompt is denied. */
const PROMPT_TIMEOUT_MS = 5 * 60 * 1000;

let mainWindow: BrowserWindow | undefined;

/** Wire the renderer-response listener once at startup. */
export function registerPermissionIpc(getWindow: () => BrowserWindow | undefined): void {
	mainWindow = getWindow();
	ipcMain.on('permissions:respond', (_event, payload: unknown) => {
		if (!isPromptResponse(payload)) return;
		const resolver = pendingPrompts.get(payload.id);
		if (!resolver) return;
		pendingPrompts.delete(payload.id);
		resolver(payload);
	});
	ipcMain.handle('permissions:get-mode', () => permissionsStore.get('mode'));
	ipcMain.handle('permissions:set-mode', (_event, mode: unknown) => {
		if (!isPermissionMode(mode)) return permissionsStore.get('mode');
		permissionsStore.set('mode', mode);
		return mode;
	});
}

/**
 * Compute the persistent key for a permission decision. `subject` is
 * normalized for shell commands (first word only) so "npm install foo"
 * and "npm install bar" share a decision.
 */
export function permissionKey(details: PromptDetails): string {
	const subject = normalizeSubject(details.op, details.subject);
	return `${details.op}|${subject}|${details.rootId ?? '*'}`;
}

function normalizeSubject(op: PermissionOp, subject: string): string {
	if (op === 'shell:run' || op === 'shell:spawn') {
		// First whitespace-delimited token is the executable; everything
		// after is args we don't gate on.
		return subject.trim().split(/\s+/)[0] ?? subject;
	}
	return subject;
}

/**
 * Resolve a permission request:
 *   1. If mode === 'yolo'  → allow.
 *   2. If mode === 'plan'  → deny.
 *   3. If mode === 'accept-edits' AND op === 'fs:write' → allow.
 *   4. If a persistent "always" decision exists for the key → use it.
 *   5. If a session decision exists for the key → use it.
 *   6. Otherwise prompt the user; the response can be once / session /
 *      always, with the latter two persisted accordingly.
 */
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

	const response = await promptRenderer(details);
	if (response.scope === 'session') sessionDecisions.set(key, response.decision);
	if (response.scope === 'always') {
		permissionsStore.set('always', {
			...permissionsStore.get('always'),
			[key]: response.decision,
		});
	}
	return response.decision;
}

function promptRenderer(details: PromptDetails): Promise<PromptResponse> {
	const id = randomUUID();
	const request: PromptRequest = { id, ...details };
	const window = mainWindow;
	if (!window || window.isDestroyed()) {
		// No renderer to ask — default-deny rather than hang.
		return Promise.resolve({ id, decision: 'deny', scope: 'once' });
	}
	window.webContents.send('permissions:prompt', request);
	return new Promise<PromptResponse>((resolve) => {
		const timeout = setTimeout(() => {
			pendingPrompts.delete(id);
			resolve({ id, decision: 'deny', scope: 'once' });
		}, PROMPT_TIMEOUT_MS);
		pendingPrompts.set(id, (response) => {
			clearTimeout(timeout);
			resolve(response);
		});
	});
}

function isPromptResponse(value: unknown): value is PromptResponse {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.id === 'string' &&
		(v.decision === 'allow' || v.decision === 'deny') &&
		(v.scope === 'once' || v.scope === 'session' || v.scope === 'always')
	);
}

function isPermissionMode(value: unknown): value is PermissionMode {
	return value === 'default' || value === 'accept-edits' || value === 'yolo' || value === 'plan';
}

/** Test-only: clear in-memory + persistent state between cases. */
export function _resetForTests(): void {
	sessionDecisions.clear();
	pendingPrompts.clear();
	permissionsStore.set('always', {});
	permissionsStore.set('mode', 'default');
}
