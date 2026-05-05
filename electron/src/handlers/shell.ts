/**
 * Shell command IPC handlers.
 *
 * Two flavours:
 *   - `shell:run`             — spawn → wait → return collected
 *                               stdout/stderr/exitCode. Use for
 *                               short-lived commands (max 30s default).
 *   - `shell:spawn-streaming` — spawn → return jobId immediately;
 *                               stdout/stderr lines streamed to the
 *                               renderer via `webContents.send`. Use
 *                               for long-running commands (`npm
 *                               install`, build watchers, etc).
 *                               `shell:kill(jobId)` cancels.
 *
 * Both gate through the permission system: subject is the first token
 * of the command, scoped per workspace root. The permission key
 * normalisation in `permissions.ts` collapses `npm install foo` and
 * `npm install bar` into a single decision about `npm`.
 *
 * cwd MUST resolve to a path inside an allowlisted workspace root —
 * otherwise the agent could `cd ~` and run anything from there.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { type BrowserWindow, ipcMain } from 'electron';

import { requestPermission } from '../permissions';
import { validateFilePath } from '../workspace';

interface RegisterOptions {
	getWindow: () => BrowserWindow | undefined;
}

interface RunRequest {
	command: string;
	args?: string[];
	cwd: string;
	env?: Record<string, string>;
	timeoutMs?: number;
}

interface RunResult {
	ok: true;
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

interface FailResult {
	ok: false;
	reason: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/** Active streaming jobs keyed by jobId. */
const streamingJobs = new Map<string, ChildProcess>();

export function registerShellHandlers({ getWindow }: RegisterOptions): void {
	ipcMain.handle('shell:run', async (_event, raw: unknown): Promise<RunResult | FailResult> => {
		const request = parseRunRequest(raw);
		if ('reason' in request) return request;

		const validatedCwd = validateFilePath(request.cwd);
		if (!validatedCwd.ok) return validatedCwd;

		const decision = await requestPermission({
			op: 'shell:run',
			subject: request.command,
			rootId: validatedCwd.root,
			context: { args: request.args ?? [], cwd: validatedCwd.resolvedPath },
		});
		if (decision === 'deny') return { ok: false, reason: 'Permission denied by user.' };

		return runCommand({
			...request,
			cwd: validatedCwd.resolvedPath,
		});
	});

	ipcMain.handle('shell:spawn-streaming', async (_event, raw: unknown) => {
		const request = parseRunRequest(raw);
		if ('reason' in request) return request;

		const validatedCwd = validateFilePath(request.cwd);
		if (!validatedCwd.ok) return validatedCwd;

		const decision = await requestPermission({
			op: 'shell:spawn',
			subject: request.command,
			rootId: validatedCwd.root,
			context: { args: request.args ?? [], cwd: validatedCwd.resolvedPath },
		});
		if (decision === 'deny')
			return { ok: false as const, reason: 'Permission denied by user.' };

		const window = getWindow();
		if (!window || window.isDestroyed()) {
			return { ok: false as const, reason: 'No active window to stream to.' };
		}

		const jobId = `shell-${randomUUID()}`;
		const child = spawn(request.command, request.args ?? [], {
			cwd: validatedCwd.resolvedPath,
			env: { ...process.env, ...(request.env ?? {}) },
			shell: false,
		});
		streamingJobs.set(jobId, child);

		const send = (channel: 'stdout' | 'stderr', line: string): void => {
			const w = getWindow();
			if (!w || w.isDestroyed()) return;
			w.webContents.send('shell:stream', { jobId, channel, line });
		};
		const lineBuffer = (channel: 'stdout' | 'stderr') => {
			let buffer = '';
			return (chunk: Buffer): void => {
				buffer += chunk.toString('utf8');
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';
				for (const line of lines) send(channel, line);
			};
		};
		child.stdout?.on('data', lineBuffer('stdout'));
		child.stderr?.on('data', lineBuffer('stderr'));
		child.on('close', (code) => {
			streamingJobs.delete(jobId);
			const w = getWindow();
			if (!w || w.isDestroyed()) return;
			w.webContents.send('shell:stream-end', { jobId, exitCode: code });
		});
		child.on('error', (err) => {
			streamingJobs.delete(jobId);
			const w = getWindow();
			if (!w || w.isDestroyed()) return;
			w.webContents.send('shell:stream-end', { jobId, exitCode: null, error: String(err) });
		});

		return { ok: true as const, jobId };
	});

	ipcMain.handle('shell:kill', async (_event, rawId: unknown) => {
		if (typeof rawId !== 'string') return { ok: false as const, reason: 'jobId required.' };
		const job = streamingJobs.get(rawId);
		if (!job) return { ok: true as const };
		job.kill();
		streamingJobs.delete(rawId);
		return { ok: true as const };
	});
}

function parseRunRequest(value: unknown): RunRequest | FailResult {
	if (!value || typeof value !== 'object') {
		return { ok: false, reason: 'Request must be an object.' };
	}
	const v = value as Record<string, unknown>;
	if (typeof v.command !== 'string' || v.command.trim().length === 0) {
		return { ok: false, reason: 'command (non-empty string) is required.' };
	}
	if (typeof v.cwd !== 'string') {
		return { ok: false, reason: 'cwd (string) is required.' };
	}
	const args = Array.isArray(v.args)
		? v.args.filter((entry): entry is string => typeof entry === 'string')
		: [];
	const env = isStringRecord(v.env) ? v.env : undefined;
	const timeoutMs =
		typeof v.timeoutMs === 'number' && v.timeoutMs > 0 ? v.timeoutMs : DEFAULT_TIMEOUT_MS;
	return {
		command: v.command,
		args,
		cwd: path.resolve(v.cwd),
		env,
		timeoutMs,
	};
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (!value || typeof value !== 'object') return false;
	return Object.values(value as Record<string, unknown>).every(
		(entry) => typeof entry === 'string'
	);
}

function runCommand(request: RunRequest): Promise<RunResult | FailResult> {
	return new Promise((resolve) => {
		const child = spawn(request.command, request.args ?? [], {
			cwd: request.cwd,
			env: { ...process.env, ...(request.env ?? {}) },
			shell: false,
		});
		let stdout = '';
		let stderr = '';
		let timedOut = false;

		const timer = setTimeout(() => {
			timedOut = true;
			child.kill();
		}, request.timeoutMs ?? DEFAULT_TIMEOUT_MS);

		child.stdout?.on('data', (chunk: Buffer) => {
			stdout += chunk.toString('utf8');
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
		});
		child.on('error', (err) => {
			clearTimeout(timer);
			resolve({ ok: false, reason: String(err) });
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			if (timedOut) {
				resolve({
					ok: false,
					reason: `Command exceeded timeout of ${request.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms.`,
				});
				return;
			}
			resolve({ ok: true, stdout, stderr, exitCode: code });
		});
	});
}

/** Tear down every active streaming job — called on app quit. */
export function disposeShellJobs(): void {
	for (const job of streamingJobs.values()) {
		try {
			job.kill();
		} catch {
			/* */
		}
	}
	streamingJobs.clear();
}
