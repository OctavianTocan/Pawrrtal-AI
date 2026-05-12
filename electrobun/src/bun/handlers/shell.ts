/**
 * Shell execution handlers for Pawrrtal's Electrobun shell.
 *
 * Ported from electron/src/handlers/shell.ts. Security contract
 * (workspace-root validation + permission gate) is identical.
 *
 * Changes:
 *   - No `ipcMain` — plain async functions called from the RPC layer.
 *   - Stream events pushed via caller-supplied callbacks instead of
 *     `webContents.send`, keeping this module testable in node env.
 *   - Uses `Bun.spawn` instead of Node's `child_process` for alignment
 *     with the Bun runtime Electrobun ships.
 */

import { randomUUID } from 'node:crypto';

import type {
	Result,
	RunRequest,
	RunResult,
	ShellStreamEnd,
	ShellStreamEvent,
} from '../../shared/rpc-types';
import { requestPermission } from '../permissions';
import { validateFilePath } from '../workspace';

/** Running streaming jobs indexed by jobId. */
const streamingJobs = new Map<string, ReturnType<typeof Bun.spawn>>();

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function handleShellRun(request: RunRequest): Promise<Result<RunResult>> {
	const cwdValidated = validateFilePath(request.cwd);
	if (!cwdValidated.ok) return cwdValidated;

	const decision = await requestPermission({
		op: 'shell:run',
		subject: `${request.command}${request.args ? ` ${request.args.join(' ')}` : ''}`,
		rootId: cwdValidated.root,
		context: { cwd: request.cwd },
	});
	if (decision === 'deny') return { ok: false, reason: 'Permission denied by user.' };

	try {
		const proc = Bun.spawn([request.command, ...(request.args ?? [])], {
			cwd: cwdValidated.resolvedPath,
			env: { ...process.env, ...(request.env ?? {}) },
			stdout: 'pipe',
			stderr: 'pipe',
		});

		const timeoutMs = request.timeoutMs ?? 60_000;
		let timedOut = false;
		const timeout = setTimeout(() => {
			timedOut = true;
			proc.kill();
		}, timeoutMs);

		const [stdout, stderr, exitCode] = await Promise.all([
			readAll(proc.stdout),
			readAll(proc.stderr),
			proc.exited,
		]);
		clearTimeout(timeout);

		if (timedOut) {
			return {
				ok: false,
				reason: `Command timed out after ${timeoutMs}ms.`,
			};
		}
		return { ok: true, stdout, stderr, exitCode };
	} catch (error) {
		return { ok: false, reason: stringifyError(error) };
	}
}

export async function handleShellSpawnStreaming(
	request: RunRequest,
	onStream: (event: ShellStreamEvent) => void,
	onEnd: (event: ShellStreamEnd) => void
): Promise<Result<{ jobId: string }>> {
	const cwdValidated = validateFilePath(request.cwd);
	if (!cwdValidated.ok) return cwdValidated;

	const decision = await requestPermission({
		op: 'shell:spawn',
		subject: `${request.command}${request.args ? ` ${request.args.join(' ')}` : ''}`,
		rootId: cwdValidated.root,
		context: { cwd: request.cwd },
	});
	if (decision === 'deny') return { ok: false, reason: 'Permission denied by user.' };

	const jobId = randomUUID();
	try {
		const proc = Bun.spawn([request.command, ...(request.args ?? [])], {
			cwd: cwdValidated.resolvedPath,
			env: { ...process.env, ...(request.env ?? {}) },
			stdout: 'pipe',
			stderr: 'pipe',
		});
		streamingJobs.set(jobId, proc);

		// Stream stdout
		streamLines(proc.stdout, (line) => onStream({ jobId, channel: 'stdout', line }));
		// Stream stderr
		streamLines(proc.stderr, (line) => onStream({ jobId, channel: 'stderr', line }));
		// On exit, send the end event.
		proc.exited
			.then((exitCode) => {
				streamingJobs.delete(jobId);
				onEnd({ jobId, exitCode });
			})
			.catch((error) => {
				streamingJobs.delete(jobId);
				onEnd({ jobId, exitCode: null, error: stringifyError(error) });
			});

		return { ok: true, jobId };
	} catch (error) {
		streamingJobs.delete(jobId);
		return { ok: false, reason: stringifyError(error) };
	}
}

export async function handleShellKill(jobId: string): Promise<Result> {
	const proc = streamingJobs.get(jobId);
	if (!proc) return { ok: false, reason: `No active job with id ${jobId}.` };
	proc.kill();
	streamingJobs.delete(jobId);
	return { ok: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readAll(stream: ReadableStream<Uint8Array> | null): Promise<string> {
	if (!stream) return '';
	const chunks: string[] = [];
	for await (const chunk of stream) {
		chunks.push(new TextDecoder().decode(chunk));
	}
	return chunks.join('');
}

async function streamLines(
	stream: ReadableStream<Uint8Array> | null,
	onLine: (line: string) => void
): Promise<void> {
	if (!stream) return;
	let buffer = '';
	for await (const chunk of stream) {
		buffer += new TextDecoder().decode(chunk);
		let nl: number;
		nl = buffer.indexOf('\n');
		while (nl !== -1) {
			onLine(buffer.slice(0, nl));
			buffer = buffer.slice(nl + 1);
			nl = buffer.indexOf('\n');
		}
	}
	if (buffer.length > 0) onLine(buffer);
}

function stringifyError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
