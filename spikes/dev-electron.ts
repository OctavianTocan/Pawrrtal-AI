/**
 * Spike + Electron dev orchestrator.
 *
 * Boots:
 *   1. The FastAPI backend on :8000 (with CORS widened to allow the
 *      spike's port).
 *   2. The spike's own dev server on its dedicated port.
 *   3. The Electron desktop shell, pointed at the spike's port via the
 *      ELECTRON_FRONTEND_PORT env var (parsed by `electron/src/server.ts`).
 *
 * Same Ctrl-C teardown semantics as `spikes/dev.ts`.  The point is that
 * each spike can be tested both in a plain browser tab AND wrapped in
 * Electron, so we can compare bundle size, latency, and IPC ergonomics
 * apples-to-apples.
 *
 * Usage (from repo root):
 *   bun run spikes/dev-electron.ts 01-react-vite       5173
 *   bun run spikes/dev-electron.ts 02-react-vite-tanstack 5174
 *   bun run spikes/dev-electron.ts 03-sveltekit        5175
 *   bun run spikes/dev-electron.ts 04-solid            5176
 *
 * Recommended entry point is `just spike-NN-electron` — see the
 * matching recipes in the repo-root justfile.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const [spikeArg, portArg] = process.argv.slice(2);
if (!spikeArg || !portArg) {
	console.error(
		'Usage: bun run spikes/dev-electron.ts <spike-dir> <frontend-port>\n' +
			'  e.g. bun run spikes/dev-electron.ts 01-react-vite 5173',
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

// Free up ports before starting (kills any ghost dev server from a
// previous Ctrl-C).
await $`lsof -ti:${frontendPort} | xargs kill -9`.quiet().nothrow();
await $`lsof -ti:8000 | xargs kill -9`.quiet().nothrow();

// First-run install for the spike if needed.
if (!existsSync(join(spikeDir, 'node_modules'))) {
	console.log(`📦 Installing ${spikeDir} dependencies (first run)…`);
	const install = spawn('pnpm', ['install'], { cwd: spikeDir, stdio: 'inherit' });
	const installCode: number = await new Promise((resolve) =>
		install.on('close', (c) => resolve(c ?? 1)),
	);
	if (installCode !== 0) {
		console.error(`pnpm install failed (exit ${installCode}) in ${spikeDir}`);
		process.exit(installCode);
	}
}

// Compile the Electron main + preload TypeScript once.  The shell
// loads from `electron/dist/`, so a fresh checkout (or a TS edit) needs
// this build before launching.
console.log('🔨 Building Electron main process…');
const electronBuild = spawn('bun', ['run', 'build'], { cwd: 'electron', stdio: 'inherit' });
const buildCode: number = await new Promise((resolve) =>
	electronBuild.on('close', (c) => resolve(c ?? 1)),
);
if (buildCode !== 0) {
	console.error(`electron build failed (exit ${buildCode})`);
	process.exit(buildCode);
}

const spikeOrigin = `http://localhost:${frontendPort}`;
const backendUrl = 'http://localhost:8000';

console.log(
	`🚀 Spike ${spikeArg} — web + Electron\n` +
		`   Backend:  ${backendUrl}\n` +
		`   Frontend: ${spikeOrigin}  (also opens in Electron)\n` +
		`   Ctrl-C tears down backend, frontend, and Electron together.\n`,
);

// Backend.  CORS widened so both browser (http://localhost:<port>) AND
// Electron's renderer (loads via http://localhost:<port> in dev) can hit
// it.  `app://` is reserved for a future loadFile mode and is harmless
// to allowlist.
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
				'http://localhost:3001',
				spikeOrigin,
				'app://.',
			]),
		},
	},
);

// Frontend — spike's own dev server.
const frontend = spawn('pnpm', ['dev'], {
	cwd: spikeDir,
	stdio: 'inherit',
	env: { ...process.env, VITE_BACKEND_URL: backendUrl },
});

// Wait briefly for the frontend port to come up before starting Electron.
// Electron's wait-on logic also handles this, but giving Vite a head
// start keeps the splash screen from immediately rendering "couldn't
// reach the server" if Vite is still warming up.
await new Promise((r) => setTimeout(r, 800));

// Electron — points at the spike's port via ELECTRON_FRONTEND_PORT.
const electron = spawn('bun', ['run', 'start:dev'], {
	cwd: 'electron',
	stdio: 'inherit',
	env: {
		...process.env,
		ELECTRON_FRONTEND_PORT: String(frontendPort),
		ELECTRON_DEV: '1',
	},
});

// Tear-down: forward SIGINT/SIGTERM to all three children.
let exiting = false;
function shutdown(signal: NodeJS.Signals): void {
	if (exiting) return;
	exiting = true;
	console.log(`\n🛑 Caught ${signal}, stopping spike + electron…`);
	electron.kill(signal);
	backend.kill(signal);
	frontend.kill(signal);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const closed = (child: ReturnType<typeof spawn>): Promise<number> =>
	new Promise((resolve) => child.on('close', (code) => resolve(code ?? 0)));

const [eCode, feCode, beCode] = await Promise.all([
	closed(electron),
	closed(frontend),
	closed(backend),
]);
process.exit(eCode || feCode || beCode);
