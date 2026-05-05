import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname),
		},
	},
	test: {
		environment: 'jsdom',
		exclude: ['**/.next/**', '**/node_modules/**', '**/e2e/**'],
		globals: false,
		setupFiles: ['./test/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			include: [
				'lib/**/*.{ts,tsx}',
				'hooks/**/*.{ts,tsx}',
				'features/**/*.{ts,tsx}',
				'components/**/*.{ts,tsx}',
			],
			exclude: [
				'**/*.test.{ts,tsx}',
				'**/*.spec.{ts,tsx}',
				'**/__tests__/**',
				'**/node_modules/**',
				'**/.next/**',
				'components/ui/**',
				'app/**',
			],
		},
	},
});
