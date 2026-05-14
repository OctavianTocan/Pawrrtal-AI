/**
 * Filesystem handlers for Pawrrtal's Electrobun shell.
 *
 * Ported from electron/src/handlers/fs.ts. The security contract
 * (workspace validation + permission gate on writes) is identical.
 *
 * Changes from the Electron version:
 *   - No `ipcMain.handle` / BrowserWindow imports — handlers are plain
 *     async functions called directly from the RPC handler in index.ts.
 *   - Watch events are pushed via a caller-supplied callback instead of
 *     `webContents.send`, keeping this module free of Electrobun imports
 *     so it can run in Vitest's node environment.
 *   - chokidar remains the watcher (works equally well under Bun).
 */

import { randomUUID } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

import { type FSWatcher, watch } from 'chokidar';

import type { DirEntry, Result, WatchEvent } from '../../shared/rpc-types';
import { requestPermission } from '../permissions';
import { validateFilePath } from '../workspace';

const watchers = new Map<string, FSWatcher>();

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function handleFsReadFile(rawPath: string): Promise<Result<{ content: string }>> {
	const validated = validateFilePath(rawPath);
	if (!validated.ok) return validated;
	try {
		const content = await fsp.readFile(validated.resolvedPath, 'utf8');
		return { ok: true, content };
	} catch (error) {
		return { ok: false, reason: stringifyError(error) };
	}
}

export async function handleFsWriteFile(rawPath: string, content: string): Promise<Result> {
	const validated = validateFilePath(rawPath);
	if (!validated.ok) return validated;

	const decision = await requestPermission({
		op: 'fs:write',
		subject:
			path.relative(validated.root, validated.resolvedPath) ||
			path.basename(validated.resolvedPath),
		rootId: validated.root,
		context: { bytes: content.length },
	});
	if (decision === 'deny') {
		return { ok: false, reason: 'Permission denied by user.' };
	}

	try {
		await fsp.mkdir(path.dirname(validated.resolvedPath), { recursive: true });
		await fsp.writeFile(validated.resolvedPath, content, 'utf8');
		return { ok: true };
	} catch (error) {
		return { ok: false, reason: stringifyError(error) };
	}
}

export async function handleFsListDirectory(
	rawPath: string
): Promise<Result<{ entries: DirEntry[] }>> {
	const validated = validateFilePath(rawPath);
	if (!validated.ok) return validated;
	try {
		const names = await fsp.readdir(validated.resolvedPath);
		const entries = await Promise.all(
			names.map(async (name) => {
				const fullPath = path.join(validated.resolvedPath, name);
				try {
					const stat = await fsp.stat(fullPath);
					return {
						name,
						path: fullPath,
						isDirectory: stat.isDirectory(),
						size: stat.size,
						modifiedAt: stat.mtimeMs,
					} satisfies DirEntry;
				} catch {
					return {
						name,
						path: fullPath,
						isDirectory: false,
						size: 0,
						modifiedAt: 0,
					} satisfies DirEntry;
				}
			})
		);
		return { ok: true, entries };
	} catch (error) {
		return { ok: false, reason: stringifyError(error) };
	}
}

export async function handleFsWatchDirectory(
	rawPath: string,
	onEvent: (event: WatchEvent) => void
): Promise<Result<{ id: string }>> {
	const validated = validateFilePath(rawPath);
	if (!validated.ok) return validated;

	const id = randomUUID();
	const watcher = watch(validated.resolvedPath, {
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 200 },
	});

	const emit = (type: WatchEvent['type'], p: string) => onEvent({ id, type, path: p });
	watcher.on('add', (p) => emit('add', p));
	watcher.on('change', (p) => emit('change', p));
	watcher.on('unlink', (p) => emit('unlink', p));
	watcher.on('addDir', (p) => emit('addDir', p));
	watcher.on('unlinkDir', (p) => emit('unlinkDir', p));
	watcher.on('error', (p) => emit('error', String(p)));

	watchers.set(id, watcher);
	return { ok: true, id };
}

export async function handleFsUnwatch(id: string): Promise<Result> {
	const watcher = watchers.get(id);
	if (!watcher) return { ok: false, reason: `No active watcher with id ${id}.` };
	await watcher.close();
	watchers.delete(id);
	return { ok: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
