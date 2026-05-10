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
		views: {
			// The webview that loads the Next.js shell.
			// In dev it hits http://localhost:3000; in production it
			// points to the bundled standalone Next.js server URL.
			mainview: {
				// No bundled HTML — we navigate to a URL at runtime.
				// The views:// scheme is only used for bundled static assets;
				// for Next.js we use http(s):// at all times.
			},
		},
	},
};
