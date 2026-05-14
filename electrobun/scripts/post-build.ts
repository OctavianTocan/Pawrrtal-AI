/**
 * Electrobun postBuild hook — copies the Next.js standalone server into the
 * app bundle so production and canary builds are self-contained.
 *
 * Electrobun calls this script after the inner app bundle is assembled but
 * before ASAR packaging and code signing. The following env vars are provided:
 *
 *   ELECTROBUN_BUILD_ENV    'dev' | 'canary' | 'stable'
 *   ELECTROBUN_BUILD_DIR    path to the inner app bundle resources dir
 *   ELECTROBUN_APP_NAME     app name with build-env suffix
 *   ELECTROBUN_APP_VERSION  version from electrobun.config.ts
 *
 * Why this is needed:
 *   src/bun/server.ts (startProductionServer) resolves the standalone root as:
 *
 *     path.resolve(import.meta.dir, '..', '..', 'frontend')
 *
 *   i.e. Resources/app/bun/ → ../../ → Resources/ → Resources/frontend/
 *
 *   So the bundle must contain:
 *     Resources/frontend/server.js            ← Next.js entry point
 *     Resources/frontend/node_modules/        ← runtime deps
 *     Resources/frontend/.next/static/        ← JS/CSS chunks
 *     Resources/frontend/public/              ← static assets
 *
 * Pre-requisite:
 *   Run `bun run build` inside the frontend/ directory BEFORE calling
 *   `electrobun build --env=stable|canary`. The build:stable script in
 *   package.json does this automatically.
 */

import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const buildEnv = process.env['ELECTROBUN_BUILD_ENV'] ?? 'dev';
const buildDir = process.env['ELECTROBUN_BUILD_DIR'];

// ── Dev builds ────────────────────────────────────────────────────────────────
// In dev mode Next.js runs as a separate process (PAWRRTAL_REPO_ROOT). Nothing
// to copy — the bundle never hosts the frontend directly.
if (buildEnv === 'dev') {
	console.log('[post-build] Dev build — skipping Next.js standalone copy.');
	process.exit(0);
}

// ── Guard: ELECTROBUN_BUILD_DIR must be set ───────────────────────────────────
if (!buildDir) {
	console.error('[post-build] ELECTROBUN_BUILD_DIR is not set. Cannot locate bundle.');
	process.exit(1);
}

// ── Resolve source paths ──────────────────────────────────────────────────────
// import.meta.dir = electrobun/scripts/ (this file's directory at build time)
const repoRoot = path.resolve(import.meta.dir, '..', '..'); // electrobun/../../ = repo root

const standaloneSource = path.join(repoRoot, 'frontend', '.next', 'standalone');
const staticSource = path.join(repoRoot, 'frontend', '.next', 'static');
const publicSource = path.join(repoRoot, 'frontend', 'public');

if (!existsSync(standaloneSource)) {
	console.error(
		`[post-build] ❌  Next.js standalone output not found at:\n  ${standaloneSource}\n\n` +
			`Run 'bun run build' inside frontend/ before building the Electrobun bundle.\n` +
			`The build:stable / build:canary scripts in electrobun/package.json do this automatically.`
	);
	process.exit(1);
}

// ── Resolve destination paths ─────────────────────────────────────────────────
// ELECTROBUN_BUILD_DIR is the Resources/ directory of the app bundle.
// server.ts resolves standalone root as Resources/frontend/.
const frontendDest = path.join(buildDir, 'frontend');
const staticDest = path.join(frontendDest, '.next', 'static');
const publicDest = path.join(frontendDest, 'public');

// ── Copy ──────────────────────────────────────────────────────────────────────
console.log(`[post-build] Bundling Next.js standalone → ${frontendDest}`);

// Clean any stale copy from a previous build.
if (existsSync(frontendDest)) {
	rmSync(frontendDest, { recursive: true, force: true });
}

// 1. Standalone tree: server.js + minimal node_modules (output: 'standalone').
cpSync(standaloneSource, frontendDest, { recursive: true });

// 2. Static build output (.next/static — JS chunks, CSS, image manifests).
//    The standalone tree does NOT include these; they must be copied separately.
if (existsSync(staticSource)) {
	cpSync(staticSource, staticDest, { recursive: true });
}

// 3. Public assets (favicon, OG images, fonts, etc.).
//    Also not included in the standalone tree.
if (existsSync(publicSource)) {
	cpSync(publicSource, publicDest, { recursive: true });
}

console.log('[post-build] ✅  Next.js standalone bundled successfully.');
