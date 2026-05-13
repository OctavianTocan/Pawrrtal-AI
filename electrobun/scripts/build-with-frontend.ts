/**
 * Cross-platform build script: builds the Next.js frontend, then runs
 * the Electrobun bundler. Replaces the bash `cd ../frontend && bun run build`
 * chain in package.json so the workflow works on macOS, Linux, and Windows.
 *
 * Usage (via package.json):
 *   bun run scripts/build-with-frontend.ts --env=stable
 *   bun run scripts/build-with-frontend.ts --env=canary
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

// ── Parse --env flag ──────────────────────────────────────────────────────────
const envArg = process.argv.find((a) => a.startsWith('--env='));
const buildEnv = envArg ? envArg.split('=')[1] : 'stable';

if (!['stable', 'canary'].includes(buildEnv)) {
	console.error(`[build] Unknown --env value: ${buildEnv}. Use stable or canary.`);
	process.exit(1);
}

const repoRoot = path.resolve(import.meta.dir, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');
const electrobunDir = path.join(repoRoot, 'electrobun');

// ── Step 1: Build the Next.js standalone output ───────────────────────────────
console.log(`[build] Building Next.js frontend in ${frontendDir} …`);

const frontendBuild = spawnSync('bun', ['run', 'build'], {
	cwd: frontendDir,
	stdio: 'inherit',
	shell: process.platform === 'win32', // required on Windows for bun.cmd
});

if (frontendBuild.status !== 0) {
	console.error(`[build] ❌  Next.js build failed (exit ${frontendBuild.status}).`);
	process.exit(frontendBuild.status ?? 1);
}

console.log('[build] ✅  Next.js build complete.');

// ── Step 2: Run Electrobun bundler (triggers postBuild hook automatically) ────
console.log(`[build] Running electrobun build --env=${buildEnv} …`);

const electrobunBuild = spawnSync('electrobun', ['build', `--env=${buildEnv}`], {
	cwd: electrobunDir,
	stdio: 'inherit',
	shell: process.platform === 'win32',
});

if (electrobunBuild.status !== 0) {
	console.error(`[build] ❌  Electrobun build failed (exit ${electrobunBuild.status}).`);
	process.exit(electrobunBuild.status ?? 1);
}

console.log(`[build] ✅  Pawrrtal ${buildEnv} build complete.`);
