import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Force NODE_ENV=test before vitest's React plugin picks the build to
// alias.  Without this, Bun's vitest runtime defaults to production for
// react-dom, which strips `React.act` and breaks @testing-library's
// `render` helper.  Set as early as possible — the React plugin reads
// it during module init.
if (process.env.NODE_ENV === undefined) {
	// `process.env.NODE_ENV` is typed `readonly` under @types/node when
	// strictly resolved, even though the runtime mutation works fine.
	// Cast through `unknown` to keep TS happy without disabling strict.
	(process.env as unknown as Record<string, string>).NODE_ENV = 'test';
}

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname),
			// Use the local vendored package when it exists; fall back to the
			// manual __mocks__ stub so tests work in ephemeral checkouts where
			// the lib/react-dropdown subpackage hasn't been set up.
			'@octavian-tocan/react-dropdown': (() => {
				const vendored = path.resolve(__dirname, 'lib/react-dropdown/src/index.ts');
				const stub = path.resolve(
					__dirname,
					'__mocks__/@octavian-tocan/react-dropdown.tsx'
				);
				// biome-ignore lint/style/useNodejsImportProtocol: CJS require in IIFE
				return require('fs').existsSync(vendored) ? vendored : stub;
			})(),
			// streamdown is ESM-only; inline it so vite can transform it, or
			// use the plain-text stub in environments where ESM interop is tricky.
			streamdown: path.resolve(__dirname, '__mocks__/streamdown.tsx'),
		},
	},
	// Vitest doesn't force NODE_ENV=test by default; React 19 loads its
	// production bundle (no React.act) when NODE_ENV=production.  Explicitly
	// set it here so @testing-library/react can call React.act correctly.
	define: {
		'process.env.NODE_ENV': JSON.stringify('test'),
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
