import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Force NODE_ENV=test before vitest's React plugin picks the build to
// alias.  Without this, Bun's vitest runtime defaults to production for
// react-dom, which strips `React.act` and breaks @testing-library's
// `render` helper.  Set as early as possible — the React plugin reads
// it during module init.
if (process.env.NODE_ENV === undefined) {
	process.env.NODE_ENV = 'test';
}

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname),
			// Match the tsconfig "paths" mapping so vitest can resolve the
			// vendored react-dropdown package the same way Next.js does.
			'@octavian-tocan/react-dropdown': path.resolve(
				__dirname,
				'lib/react-dropdown/src/index.ts'
			),
		},
	},
	test: {
		environment: 'jsdom',
		exclude: [
			'**/.next/**',
			'**/node_modules/**',
			'**/e2e/**',
			// react-dropdown owns its own vitest config (globals enabled). When
			// the frontend's runner picks them up, the bare `describe/it/expect`
			// references fail to resolve. Run package tests via:
			//   `cd lib/react-dropdown && bunx vitest run`
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
			],
			exclude: [
				'**/*.test.{ts,tsx}',
				'**/*.spec.{ts,tsx}',
				'**/__tests__/**',
				'**/node_modules/**',
				'**/.next/**',
				'components/ui/**',
				'app/**',
				// Coverage for the vendored react-dropdown package is owned by
				// its own vitest config in lib/react-dropdown/.
				'lib/react-dropdown/**',
			],
		},
	},
});
