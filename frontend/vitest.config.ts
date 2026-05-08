import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Force NODE_ENV=test before vitest's React plugin picks the build to
// alias.  Without this, Bun's vitest runtime defaults to production for
// react-dom, which strips `React.act` and breaks @testing-library's
// `render` helper.
if (process.env.NODE_ENV === undefined) {
	(process.env as unknown as Record<string, string>).NODE_ENV = 'test';
}

const dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(dirname),
			'@octavian-tocan/react-dropdown': path.resolve(
				dirname,
				'lib/react-dropdown/src/index.ts',
			),
		},
	},
	test: {
		environment: 'jsdom',
		exclude: [
			'**/dist/**',
			'**/node_modules/**',
			'**/e2e/**',
			'lib/react-dropdown/**',
		],
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
				'src/**/*.{ts,tsx}',
			],
			exclude: [
				'**/*.test.{ts,tsx}',
				'**/*.spec.{ts,tsx}',
				'**/__tests__/**',
				'**/node_modules/**',
				'**/dist/**',
				'components/ui/**',
				'lib/react-dropdown/**',
			],
		},
	},
});
