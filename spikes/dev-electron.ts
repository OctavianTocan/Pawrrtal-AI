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
import waitOn from 'wait-on';

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

// Always run `pnpm install` (not just on first run).  The spikes ship
// without a committed `pnpm-lock.yaml`, so pnpm 11's deps-status check
// inside `pnpm run <script>` fails preflight on a fresh clone if any
// transitive version skewed.  Running install up-front is idempotent
// when nothing changed and fast on repeat.
console.log(`📦 Ensuring ${spikeDir} dependencies are installed…`);
const install = spawn('pnpm', ['install'], { cwd: spikeDir, stdio: 'inherit' });
const installCode: number = await new Promise((resolve) =>
	install.on('close', (c) => resolve(c ?? 1)),
);
if (installCode !== 0) {
	console.error(`pnpm install failed (exit ${installCode}) in ${spikeDir}`);
	process.exit(installCode);
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
// Electron's renderer can hit it.  `app://` is reserved for a future
// loadFile mode and is harmless to allowlist.
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

// Frontend — spike's own dev server.  We bypass `pnpm dev` (which
// re-runs pnpm 11's deps-status preflight that can fail without a
// committed lockfile) and call the framework's binary directly via
// `pnpm exec`.  Each spike's `dev` script is just `vite` (or
// `vite dev` for SvelteKit), so this matches the previous behaviour
// without the preflight.
const viteArgs = spikeArg.startsWith('03-sveltekit') ? ['exec', 'vite', 'dev'] : ['exec', 'vite'];
const frontend = spawn('pnpm', viteArgs, {
	cwd: spikeDir,
	stdio: 'inherit',
	env: { ...process.env, VITE_BACKEND_URL: backendUrl },
});

// Block until the frontend port is actually listening before launching
// Electron.  Previously we slept 800ms and let Electron's own wait-on
// retry, which surfaced "couldn't reach the dev server" splash if Vite
// took longer than 60s on first cold install.  Waiting here with a
// proper timeout + actionable error is more honest.
console.log(`⏳ Waiting for frontend on :${frontendPort}…`);
try {
	await waitOn({
		resources: [`tcp:127.0.0.1:${frontendPort}`],
		timeout: 120_000,
		interval: 250,
	});
} catch (err) {
	console.error(
		`\n❌ Frontend on :${frontendPort} did not come up within 120s.\n` +
			`Common causes:\n` +
			`  - pnpm install errored silently (re-run with PNPM_DEBUG=1)\n` +
			`  - port collision (try: lsof -i :${frontendPort})\n` +
			`  - the spike's package.json "dev" script doesn't bind on that port\n` +
			`Underlying error: ${err}\n`,
	);
	frontend.kill('SIGTERM');
	backend.kill('SIGTERM');
	process.exit(1);
}
console.log('✅ Frontend reachable. Starting Electron…');

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
