/**
 * Workspace allowlist for the desktop shell.
 *
 * Privileged ops (file write, shell exec, directory watch) MUST resolve
 * to a path inside one of the user-approved workspace roots before they
 * run. This is the boundary that keeps the agent from writing outside
 * the user's intent — without it, a hallucinated tool call could
 * `rm -rf $HOME` from inside an LLM turn.
 *
 * The allowlist is persisted via electron-store so it survives across
 * app launches. Default root is `~/Pawrrtal-Workspace/`, auto-created
 * on first launch (the user can add more via the workspace settings
 * surface). All path validation happens after symlink resolution so a
 * symlink inside an allowed root pointing OUTSIDE the root is rejected.
 */

import { mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

import { createStore } from './lib/typed-store';

interface PersistedWorkspace extends Record<string, unknown> {
	roots: string[];
}

/** Successful containment check after realpath resolution. */
interface ValidationOk {
	ok: true;
	resolvedPath: string;
	root: string;
}

/** Validation failed; `reason` is safe to surface in UI or logs. */
interface ValidationFail {
	ok: false;
	reason: string;
}

/** Outcome of {@link validateFilePath} — discriminated on `ok`. */
export type ValidationResult = ValidationOk | ValidationFail;

const workspaceStore = createStore<PersistedWorkspace>({
	name: 'workspace',
	defaults: { roots: [] },
});

let cachedRoots: string[] | undefined;

/**
 * Auto-create the default workspace root if the user has never
 * configured one. Idempotent: subsequent launches are a no-op.
 */
export function ensureDefaultWorkspaceRoot(): void {
	const existing = workspaceStore.get('roots');
	if (existing.length > 0) {
		cachedRoots = existing;
		return;
	}
	const defaultRoot = path.join(app.getPath('home'), 'Pawrrtal-Workspace');
	try {
		mkdirSync(defaultRoot, { recursive: true });
	} catch {
		// If we can't create the default (e.g. read-only home), still
		// register the path — the user can pick a different one via the
		// FE workspace settings surface.
	}
	workspaceStore.set('roots', [defaultRoot]);
	cachedRoots = [defaultRoot];
}

/** Return every currently-allowlisted workspace root. */
export function listRoots(): string[] {
	if (cachedRoots === undefined) cachedRoots = workspaceStore.get('roots');
	return [...cachedRoots];
}

/** Add a new root to the allowlist. Idempotent on duplicates. */
export function addRoot(rootPath: string): string[] {
	const normalized = path.resolve(rootPath);
	const current = listRoots();
	if (current.includes(normalized)) return current;
	const next = [...current, normalized];
	workspaceStore.set('roots', next);
	cachedRoots = next;
	return next;
}

/** Remove a root from the allowlist. Idempotent on absent entries. */
export function removeRoot(rootPath: string): string[] {
	const normalized = path.resolve(rootPath);
	const next = listRoots().filter((entry) => entry !== normalized);
	workspaceStore.set('roots', next);
	cachedRoots = next;
	return next;
}

/**
 * Validate that `targetPath` resolves to a location inside one of the
 * allowlisted roots. Returns the resolved (real) path on success so
 * callers don't have to re-resolve.
 *
 * Resolution sequence:
 *   1. Resolve `targetPath` to an absolute path.
 *   2. Walk up the path until we find an existing ancestor (so we can
 *      `realpathSync` it). This handles "write to a new file in an
 *      existing dir" without failing on the not-yet-existing leaf.
 *   3. Compare the resolved real path against each allowlisted root's
 *      real path. Rejects if no root contains it.
 *
 * Symlink trickery (a symlink inside an allowed root pointing OUT of
 * the root) is caught because we resolve the real path before the
 * containment check.
 */
export function validateFilePath(targetPath: string): ValidationResult {
	if (typeof targetPath !== 'string' || targetPath.length === 0) {
		return { ok: false, reason: 'Path must be a non-empty string.' };
	}
	const absolute = path.resolve(targetPath);
	const realPath = resolveRealPathOrNearest(absolute);
	const roots = listRoots();
	if (roots.length === 0) {
		return { ok: false, reason: 'No workspace roots configured.' };
	}
	for (const root of roots) {
		const realRoot = safeRealpath(root);
		if (realRoot && isInside(realPath, realRoot)) {
			return { ok: true, resolvedPath: realPath, root: realRoot };
		}
	}
	return {
		ok: false,
		reason: `Path is outside every allowlisted workspace root. Add a root via Settings → Workspace if this is intentional.`,
	};
}

/**
 * Walk up `absolute` until we find an existing ancestor and return
 * `realpathSync(ancestor) + the trailing relative path`. Lets us
 * validate paths that don't exist yet (write-new-file case) while
 * still checking the parent's real location.
 */
function resolveRealPathOrNearest(absolute: string): string {
	let current = absolute;
	const segments: string[] = [];
	while (true) {
		const real = safeRealpath(current);
		if (real) return path.join(real, ...segments.reverse());
		const parent = path.dirname(current);
		if (parent === current) {
			// Hit the root without finding anything. Return the absolute
			// as-is; the containment check will reject it.
			return absolute;
		}
		segments.push(path.basename(current));
		current = parent;
	}
}

function safeRealpath(target: string): string | null {
	try {
		return realpathSync(target);
	} catch {
		return null;
	}
}

function isInside(candidate: string, root: string): boolean {
	const relative = path.relative(root, candidate);
	if (relative === '') return true;
	if (relative.startsWith('..')) return false;
	if (path.isAbsolute(relative)) return false;
	return true;
}

/**
 * Test-only escape hatch: clear the in-memory cache so the next read
 * pulls from the persisted store. Used by Vitest to reset between
 * cases without touching the real on-disk store.
 */
export function _resetCacheForTests(): void {
	cachedRoots = undefined;
}
