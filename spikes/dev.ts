/**
 * Spike dev orchestrator.
 *
 * Boots the FastAPI backend on :8000 and a single spike's frontend dev
 * server in parallel.  Ctrl-C tears the whole stack down.
 *
 * Usage (from repo root):
 *   bun run spikes/dev.ts 01-react-vite       5173
 *   bun run spikes/dev.ts 02-react-vite-tanstack 5174
 *   bun run spikes/dev.ts 03-sveltekit        5175
 *   bun run spikes/dev.ts 04-solid            5176
 *
 * Recommended entry point is `just spike-NN` — see the matching recipes
 * in the repo-root justfile.  This script can be invoked directly when
 * you want to override the port.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const [spikeArg, portArg] = process.argv.slice(2);
if (!spikeArg || !portArg) {
	console.error(
		'Usage: bun run spikes/dev.ts <spike-dir> <frontend-port>\n' +
			'  e.g. bun run spikes/dev.ts 01-react-vite 5173',
	);
	process.exit(1);
}

const spikeDir = join('spikes', spikeArg);
const frontendPort = Number(portArg);
if (Number.isNaN(frontendPort)) {
	console.error(`Invalid port: ${portArg}`);
	process.exit(1);
}
if (!existsSync(spikeDir)) {
	console.error(`Spike directory not found: ${spikeDir}`);
	process.exit(1);
}

// Free up the spike's port + the backend port before starting (kills any
// ghost dev server from a previous Ctrl-C).
await $`lsof -ti:${frontendPort} | xargs kill -9`.quiet().nothrow();
await $`lsof -ti:8000 | xargs kill -9`.quiet().nothrow();

// Always run `pnpm install` (not just on first run).  pnpm 11's
// deps-status preflight inside `pnpm run <script>` can error without
// a committed lockfile; running install up-front is idempotent when
// nothing changed and fast on repeat.
console.log(`📦 Ensuring ${spikeDir} dependencies are installed…`);
const install = spawn('pnpm', ['install'], { cwd: spikeDir, stdio: 'inherit' });
const installCode: number = await new Promise((resolve) => install.on('close', (c) => resolve(c ?? 1)));
if (installCode !== 0) {
	console.error(`pnpm install failed (exit ${installCode}) in ${spikeDir}`);
	process.exit(installCode);
}

const spikeOrigin = `http://localhost:${frontendPort}`;
const backendUrl = 'http://localhost:8000';

console.log(
	`🚀 Spike ${spikeArg}\n` +
		`   Backend:  ${backendUrl}\n` +
		`   Frontend: ${spikeOrigin}\n` +
		`   CORS:     allowing ${spikeOrigin} for this run\n` +
		`   Ctrl-C tears down both processes.\n`,
);

// Backend process — same args as the root dev orchestrator, but with the
// CORS_ORIGINS env var widened so this spike's port is allowed alongside
// the Next.js dev port.  We inherit the rest of process.env so secrets
// from backend/.env still load.
const backend = spawn(
	'uv',
	[
		'run',
		'--project',
		'backend',
		'uvicorn',
		'main:app',
		'--app-dir',
		'backend',
		'--host',
		'127.0.0.1',
		'--port',
		'8000',
		'--reload',
		'--reload-dir',
		'backend',
	],
	{
		stdio: 'inherit',
		env: {
			...process.env,
			CORS_ORIGINS: JSON.stringify([
				'http://localhost:3001', // existing Next.js dev port — kept so `just dev` still works alongside
				spikeOrigin,
			]),
		},
	},
);

// Frontend process — invoke vite directly via `pnpm exec` to bypass
// pnpm 11's deps-status preflight that runs inside `pnpm run dev`.
// SvelteKit's dev needs `vite dev`, others just `vite`.
const viteArgs = spikeArg.startsWith('03-sveltekit')
	? ['exec', 'vite', 'dev']
	: ['exec', 'vite'];
const frontend = spawn('pnpm', viteArgs, {
	cwd: spikeDir,
	stdio: 'inherit',
	env: { ...process.env, VITE_BACKEND_URL: backendUrl },
});

// Tear-down: forward SIGINT/SIGTERM to children, then exit when both have.
let exiting = false;
function shutdown(signal: NodeJS.Signals): void {
	if (exiting) return;
	exiting = true;
	console.log(`\n🛑 Caught ${signal}, stopping spike…`);
	backend.kill(signal);
	frontend.kill(signal);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const closed = (child: ReturnType<typeof spawn>): Promise<number> =>
	new Promise((resolve) => child.on('close', (code) => resolve(code ?? 0)));

const [feCode, beCode] = await Promise.all([closed(frontend), closed(backend)]);
process.exit(feCode || beCode);
