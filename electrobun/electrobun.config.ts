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
		// No `views` entries needed: BrowserWindow loads the Next.js frontend
		// via a plain http(s):// URL (`url: FRONTEND_URL` in src/bun/index.ts).
		// The `views` block is only for bundled TypeScript webview entrypoints
		// served under the views:// scheme — not applicable here.
	},
};
