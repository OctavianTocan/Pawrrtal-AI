/**
 * Filesystem IPC handlers for the desktop shell.
 *
 * Every handler:
 *   1. Validates the target path against the workspace allowlist via
 *      `validateFilePath`.
 *   2. Gates writes through the permission system (reads + lists are
 *      always allowed once the path is allowlisted — read access
 *      doesn't change the user's machine).
 *   3. Returns a structured `{ ok, ... }` result so the renderer never
 *      has to catch raw exceptions.
 *
 * Watcher events are streamed to the renderer via
 * `webContents.send('fs:watch-event', { id, type, path })`. The
 * renderer subscribes via the preload bridge.
 */

import { promises as fsp, type Stats } from 'node:fs';
import path from 'node:path';
import { type FSWatcher, watch } from 'chokidar';
import { type BrowserWindow, ipcMain } from 'electron';

import { requestPermission } from '../permissions';
import { validateFilePath } from '../workspace';

interface RegisterOptions {
	getWindow: () => BrowserWindow | undefined;
}

/** One row from `fs:list-directory` with stable fields for the renderer file tree. */
export interface DirEntry {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	modifiedAt: number;
}

interface WatchHandle {
	id: string;
	watcher: FSWatcher;
}

const watchers = new Map<string, WatchHandle>();
let nextWatchId = 0;

/**
 * Registers `fs:*` handlers (read, write, list, watch, unwatch) with workspace
 * validation and permission checks on writes.
 *
 * @param getWindow - Used to push `fs:watch-event` payloads to the active renderer.
 */
export function registerFsHandlers({ getWindow }: RegisterOptions): void {
	ipcMain.handle('fs:read-file', async (_event, rawPath: unknown) => {
		if (typeof rawPath !== 'string') return { ok: false as const, reason: 'Path required.' };
		const validated = validateFilePath(rawPath);
		if (!validated.ok) return validated;
		try {
			const content = await fsp.readFile(validated.resolvedPath, 'utf8');
			return { ok: true as const, content };
		} catch (error) {
			return { ok: false as const, reason: stringifyError(error) };
		}
	});

	ipcMain.handle('fs:write-file', async (_event, rawPath: unknown, content: unknown) => {
		if (typeof rawPath !== 'string' || typeof content !== 'string') {
			return { ok: false as const, reason: 'Path + string content required.' };
		}
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
			return { ok: false as const, reason: 'Permission denied by user.' };
		}

		try {
			await fsp.mkdir(path.dirname(validated.resolvedPath), { recursive: true });
			await fsp.writeFile(validated.resolvedPath, content, 'utf8');
			return { ok: true as const };
		} catch (error) {
			return { ok: false as const, reason: stringifyError(error) };
		}
	});

	ipcMain.handle('fs:list-directory', async (_event, rawPath: unknown) => {
		if (typeof rawPath !== 'string') return { ok: false as const, reason: 'Path required.' };
		const validated = validateFilePath(rawPath);
		if (!validated.ok) return validated;
		try {
			const entries = await fsp.readdir(validated.resolvedPath, { withFileTypes: true });
			const result: DirEntry[] = await Promise.all(
				entries.map(async (entry): Promise<DirEntry> => {
					const fullPath = path.join(validated.resolvedPath, entry.name);
					const stats: Stats = await fsp.stat(fullPath).catch(
						() =>
							({
								size: 0,
								mtimeMs: 0,
							}) as Stats
					);
					return {
						name: entry.name,
						path: fullPath,
						isDirectory: entry.isDirectory(),
						size: stats.size ?? 0,
						modifiedAt: stats.mtimeMs ?? 0,
					};
				})
			);
			return { ok: true as const, entries: result };
		} catch (error) {
			return { ok: false as const, reason: stringifyError(error) };
		}
	});

	ipcMain.handle('fs:watch-directory', async (_event, rawPath: unknown) => {
		if (typeof rawPath !== 'string') return { ok: false as const, reason: 'Path required.' };
		const validated = validateFilePath(rawPath);
		if (!validated.ok) return validated;

		const id = `watch-${++nextWatchId}`;
		const watcher = watch(validated.resolvedPath, {
			ignoreInitial: true,
			persistent: true,
			ignored: (target) => target.includes('/node_modules/') || target.includes('/.git/'),
		});

		const send = (type: string, eventPath: string): void => {
			const window = getWindow();
			if (!window || window.isDestroyed()) return;
			window.webContents.send('fs:watch-event', { id, type, path: eventPath });
		};
		watcher.on('add', (p) => send('add', p));
		watcher.on('change', (p) => send('change', p));
		watcher.on('unlink', (p) => send('unlink', p));
		watcher.on('addDir', (p) => send('addDir', p));
		watcher.on('unlinkDir', (p) => send('unlinkDir', p));
		watcher.on('error', (err) => send('error', String(err)));

		watchers.set(id, { id, watcher });
		return { ok: true as const, id };
	});

	ipcMain.handle('fs:unwatch', async (_event, rawId: unknown) => {
		if (typeof rawId !== 'string') return { ok: false as const, reason: 'id required.' };
		const handle = watchers.get(rawId);
		if (!handle) return { ok: true as const };
		await handle.watcher.close();
		watchers.delete(rawId);
		return { ok: true as const };
	});
}

/**
 * Tear down every active watcher — called from main on `before-quit`
 * so we never leak a watcher across restarts during dev.
 */
export async function disposeFsWatchers(): Promise<void> {
	const handles = [...watchers.values()];
	watchers.clear();
	await Promise.all(handles.map((h) => h.watcher.close()));
}

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
