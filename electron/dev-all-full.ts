#!/usr/bin/env bun
/**
 * Full-stack one-shot dev orchestrator for the Electron desktop shell.
 *
 * Spawns the **root** dev orchestrator (`bun run dev.ts` → Next.js +
 * FastAPI), waits for `:3001` to come up, then launches Electron
 * pointing at it. Replaces the two-terminal workflow (`just dev` +
 * `just electron-dev`) with a single command for full-stack desktop
 * iteration.
 *
 * Stops both children cleanly on Ctrl-C / SIGINT / SIGTERM so the dev
 * ports don't stay locked between attempts.
 *
 * Sibling to `dev-all.ts` — the difference is the spawned orchestrator:
 * `dev-all.ts` runs the FE only, this one runs the FE + BE.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dir, '..');
const FRONTEND_PORT = 3001;
const READY_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 500;

/** Spawn a child + inherit stdio so the user sees both servers' logs. */
function spawnInherited(command: string, args: string[], cwd: string): ChildProcess {
	return spawn(command, args, {
		cwd,
		stdio: 'inherit',
		env: { ...process.env, FORCE_COLOR: '1' },
	});
}

/** Poll a TCP port until it accepts connections or the deadline passes. */
async function waitForPort(port: number, host = 'localhost'): Promise<void> {
	const deadline = Date.now() + READY_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const reachable = await new Promise<boolean>((resolve) => {
			const net = require('node:net') as typeof import('node:net');
			const socket = new net.Socket();
			socket.setTimeout(1_000);
			socket.once('error', () => {
				socket.destroy();
				resolve(false);
			});
			socket.once('timeout', () => {
				socket.destroy();
				resolve(false);
			});
			socket.connect(port, host, () => {
				socket.destroy();
				resolve(true);
			});
		});
		if (reachable) return;
		await new Promise((r) => setTimeout(r, READY_POLL_MS));
	}
	throw new Error(`Timed out waiting for ${host}:${port}`);
}

async function main(): Promise<void> {
	console.log('[electron-dev-full] starting backend + frontend via root dev.ts…');
	// Drive the root orchestrator, which already handles port-cleanup,
	// the .next dev lock, and process supervision for both servers.
	const stack = spawnInherited('bun', ['run', 'dev.ts'], REPO_ROOT);

	const cleanup = (signal: NodeJS.Signals | 'exit'): void => {
		console.log(`\n[electron-dev-full] received ${signal}, shutting down…`);
		if (!stack.killed) stack.kill('SIGTERM');
	};
	process.on('SIGINT', () => cleanup('SIGINT'));
	process.on('SIGTERM', () => cleanup('SIGTERM'));
	process.on('exit', () => cleanup('exit'));

	try {
		await waitForPort(FRONTEND_PORT);
	} catch (err) {
		console.error(`[electron-dev-full] ${(err as Error).message}`);
		process.exit(1);
	}

	console.log('[electron-dev-full] launching Electron…');
	const electron = spawnInherited('bun', ['run', 'start:dev'], path.join(REPO_ROOT, 'electron'));

	electron.on('exit', (code) => {
		console.log(`[electron-dev-full] electron exited (code=${code ?? 0}); stopping dev stack…`);
		if (!stack.killed) stack.kill('SIGTERM');
		process.exit(code ?? 0);
	});

	stack.on('exit', (code) => {
		console.log(`[electron-dev-full] dev stack exited (code=${code ?? 0}); stopping electron…`);
		if (!electron.killed) electron.kill('SIGTERM');
		process.exit(code ?? 0);
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
