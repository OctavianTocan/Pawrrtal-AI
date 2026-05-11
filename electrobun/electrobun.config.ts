/**
 * Electrobun build configuration for Pawrrtal.
 *
 * Mirrors the electron/ shell's responsibility: wrap the Next.js frontend
 * (running on localhost:3000 in dev, or spawned as a standalone Next.js
 * server in production) inside a native desktop window.
 *
 * Key differences from the Electron build:
 *   - No separate preload script — IPC is replaced by Electrobun's typed RPC.
 *   - electron-store replaced by a lightweight JSON file store (src/bun/store.ts).
 *   - contextBridge.exposeInMainWorld replaced by shared src/shared/rpc-types.ts.
 */
export default {
	app: {
		name: 'Pawrrtal',
		identifier: 'ai.pawrrtal.app',
		version: '0.1.0',
	},
	build: {
		bun: {
			entrypoint: 'src/bun/index.ts',
		},
		// No TypeScript view bundles needed — BrowserWindow loads Next.js via http://.
		// We DO copy a static splash HTML so we can use views://splash/index.html
		// as the initial URL while waiting for Next.js to boot. views:// is a
		// proper secure context (unlike data: URLs) so Electrobun preload scripts
		// (which use crypto.subtle) work correctly on the splash page.
		copy: {
			'src/splash/index.html': 'views/splash/index.html',
		},
	},
};
