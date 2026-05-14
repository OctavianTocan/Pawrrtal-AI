import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/__tests__/**',
				'**/*.stories.{ts,tsx}',
				'**/index.ts',
				'**/types/**',
				'**/vitest.*',
			],
		},
	},
});
