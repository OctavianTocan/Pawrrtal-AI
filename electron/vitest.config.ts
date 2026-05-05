/**
 * Vitest config for the Electron main-process workspace.
 *
 * Runs in node environment (no jsdom — main process never touches the
 * DOM). Uses a temp HOME via env so electron-store doesn't write into
 * the real ~/Library/Application Support during tests.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		exclude: ['dist/**', 'node_modules/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['**/*.test.ts', 'src/main.ts', 'src/preload.ts'],
		},
	},
});
