/**
 * Vite config for the Pawrrtal frontend (post-Next.js migration).
 *
 * Stack:
 *   - Vite as the dev server / bundler
 *   - @vitejs/plugin-react for React 19 + Fast Refresh
 *   - @tanstack/router-plugin for file-based routing (generates routeTree.gen.ts
 *     from src/routes/*.tsx)
 *   - @tailwindcss/vite for Tailwind 4 (replaces postcss.config.mjs)
 *
 * The previous Next.js layout (`app/`) was migrated to TanStack Router file
 * routes under `src/routes/`.  See migration notes in the PR body.
 */

import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Force NODE_ENV=test for vitest config so React picks the dev build, see
// vitest.config.ts for the same guard.
if (process.env.NODE_ENV === undefined) {
	(process.env as unknown as Record<string, string>).NODE_ENV = 'development';
}

export default defineConfig({
	plugins: [
		// Order matters: router plugin first so generated route files exist
		// when the React Babel transform runs.
		TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, '.'),
		},
	},
	server: {
		port: 3001,
		// Match Next.js' previous behavior: bind localhost so Electron's
		// dev-server probe (electron/src/server.ts) hits the same address.
		host: 'localhost',
	},
	build: {
		// Next.js built into `.next/`; we keep the `dist/` standard so the
		// Electron production server can serve a static directory.
		outDir: 'dist',
		emptyOutDir: true,
	},
});
