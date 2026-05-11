/**
 * Workspace allowlist for Pawrrtal's Electrobun shell.
 *
 * Ported from electron/src/workspace.ts. The security contract is
 * identical; the only changes are:
 *   - `electron-store` → `./store` (Bun-native JSON file store)
 *   - `app.getPath('home')` → `homedir()` from node:os
 *
 * Everything else — path validation logic, symlink rejection, the
 * test-only `_resetCacheForTests` escape hatch — is unchanged so that
 * both shells stay in sync and the Vitest suite can cover both.
 */

import { mkdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

import { createStore } from './store';

interface PersistedWorkspace extends Record<string, unknown> {
	roots: string[];
}

export interface ValidationOk {
	ok: true;
	resolvedPath: string;
	root: string;
}
export interface ValidationFail {
	ok: false;
	reason: string;
}
export type ValidationResult = ValidationOk | ValidationFail;

const workspaceStore = createStore<PersistedWorkspace>({
	name: 'workspace',
	defaults: { roots: [] },
});

let cachedRoots: string[] | undefined;

export function ensureDefaultWorkspaceRoot(): void {
	const existing = workspaceStore.get('roots');
	if (existing.length > 0) {
		cachedRoots = existing;
		return;
	}
	const defaultRoot = path.join(homedir(), 'Pawrrtal-Workspace');
	try {
		mkdirSync(defaultRoot, { recursive: true });
	} catch {
		// read-only home — still register and let the user pick via settings.
	}
	workspaceStore.set('roots', [defaultRoot]);
	cachedRoots = [defaultRoot];
}

export function listRoots(): string[] {
	if (cachedRoots === undefined) cachedRoots = workspaceStore.get('roots');
	return [...cachedRoots];
}

export function addRoot(rootPath: string): string[] {
	const normalized = path.resolve(rootPath);
	const current = listRoots();
	if (current.includes(normalized)) return current;
	const next = [...current, normalized];
	workspaceStore.set('roots', next);
	cachedRoots = next;
	return next;
}

export function removeRoot(rootPath: string): string[] {
	const normalized = path.resolve(rootPath);
	const next = listRoots().filter((entry) => entry !== normalized);
	workspaceStore.set('roots', next);
	cachedRoots = next;
	return next;
}

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

function resolveRealPathOrNearest(absolute: string): string {
	let current = absolute;
	const segments: string[] = [];
	while (true) {
		const real = safeRealpath(current);
		if (real) return path.join(real, ...segments.reverse());
		const parent = path.dirname(current);
		if (parent === current) return absolute;
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

export function _resetCacheForTests(): void {
	cachedRoots = undefined;
}
