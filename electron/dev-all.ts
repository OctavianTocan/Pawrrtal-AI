#!/usr/bin/env bun
/**
 * One-shot dev orchestrator for the Electron desktop shell.
 *
 * Spawns the Next.js dev server, waits for `:3001` to come up, then
 * launches Electron pointing at it. Replaces the two-terminal workflow
 * (`just dev` + `bun run start:dev`) with a single command for users
 * who want the desktop shell only and don't need the backend.
 *
 * Stops both children cleanly on Ctrl-C / SIGINT / SIGTERM so the dev
 * port doesn't stay locked between attempts.
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
	console.log('[electron-dev-all] starting Next.js dev server on :3001…');
	const frontend = spawnInherited('bun', ['--filter', 'pawrrtal', 'dev'], REPO_ROOT);

	const cleanup = (signal: NodeJS.Signals | 'exit'): void => {
		console.log(`\n[electron-dev-all] received ${signal}, shutting down…`);
		if (!frontend.killed) frontend.kill('SIGTERM');
	};
	process.on('SIGINT', () => cleanup('SIGINT'));
	process.on('SIGTERM', () => cleanup('SIGTERM'));
	process.on('exit', () => cleanup('exit'));

	try {
		await waitForPort(FRONTEND_PORT);
	} catch (err) {
		console.error(`[electron-dev-all] ${(err as Error).message}`);
		process.exit(1);
	}

	console.log('[electron-dev-all] launching Electron…');
	const electron = spawnInherited('bun', ['run', 'start:dev'], path.join(REPO_ROOT, 'electron'));

	electron.on('exit', (code) => {
		console.log(`[electron-dev-all] electron exited (code=${code ?? 0}); stopping dev server…`);
		if (!frontend.killed) frontend.kill('SIGTERM');
		process.exit(code ?? 0);
	});

	frontend.on('exit', (code) => {
		console.log(`[electron-dev-all] frontend exited (code=${code ?? 0}); stopping electron…`);
		if (!electron.killed) electron.kill('SIGTERM');
		process.exit(code ?? 0);
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
