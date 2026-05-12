/**
 * Electrobun build configuration for Pawrrtal.
 *
 * Mirrors the electron/ shell's responsibility: wrap the Next.js frontend
 * (running on localhost:3001 in dev, or spawned as a standalone Next.js
 * server in production) inside a native desktop window.
 *
 * Key differences from the Electron build:
 *   - No separate preload script — IPC is replaced by Electrobun's typed RPC.
 *   - electron-store replaced by a lightweight JSON file store (src/bun/store.ts).
 *   - contextBridge.exposeInMainWorld replaced by shared src/shared/rpc-types.ts.
 *
 * Production build pipeline:
 *   1. Build the Next.js frontend:    cd ../frontend && bun run build
 *   2. Build the Electrobun bundle:   electrobun build --env=stable
 *      → scripts.postBuild copies frontend/.next/standalone into the app bundle
 *      → src/bun/server.ts finds it at Resources/frontend/ and spawns it
 */
import type { ElectrobunConfig } from 'electrobun';

export default {
	app: {
		name: 'Pawrrtal',
		identifier: 'ai.pawrrtal.app',
		version: '0.1.0',

		// Deep-link URL scheme — lets the OS open the app when a link like
		// pawrrtal://... is clicked. Required for OAuth callbacks, share links, etc.
		// NOTE: macOS only registers URL schemes when the app is in /Applications.
		urlSchemes: ['pawrrtal'],
	},

	build: {
		bun: {
			entrypoint: 'src/bun/index.ts',
		},

		// Pawrrtal loads Next.js via HTTP — no compiled TypeScript views are needed.
		// We copy a static splash HTML so views://splash/index.html works as a
		// secure context (crypto.subtle) while Next.js boots up.
		copy: {
			'src/splash/index.html': 'views/splash/index.html',
		},

		// Additional dirs to watch in `electrobun dev --watch` mode, beyond the
		// automatic watch of the bun entrypoint directory. Handlers and shared
		// RPC types live outside src/bun/ so we need to include them explicitly.
		watch: [
			'src/shared',
			'src/bun/handlers',
		],

		// Don't trigger rebuilds for build/artifact output or generated files.
		watchIgnore: [
			'build/**',
			'artifacts/**',
			'**/*.generated.*',
		],

		// ── macOS platform config ──────────────────────────────────────────────
		mac: {
			// App icon: place a 1024×1024 PNG or an .iconset/ directory here.
			// Generate an .iconset with: iconutil -c iconset icon.icns
			// Uncomment once the asset exists:
			// icons: 'icon.iconset',

			// Code signing + notarization for distribution (App Store / direct).
			// Requires APPLE_DEVELOPER_CERTIFICATE + APPLE_NOTARIZE_CREDENTIALS.
			// codesign: true,
			// notarize: true,

			// Entitlements for future hardware access (mic/camera for voice/video):
			// entitlements: {
			//   'com.apple.security.device.microphone':
			//     'Required for voice input features',
			//   'com.apple.security.device.camera':
			//     'Required for avatar and video features',
			// },
		},

		// ── Windows platform config ───────────────────────────────────────────
		win: {
			// App icon: provide a .ico file (multi-resolution, 16/32/48/256px).
			// Convert from PNG: magick icon-256.png -define icon:auto-resize=256,48,32,16 icon.ico
			// Uncomment once the asset exists:
			// icons: 'icon.ico',

			// CEF gives a consistent Chromium renderer across Windows versions,
			// avoiding WebView2 availability/version issues on older machines.
			// Adds ~120MB to the bundle but removes the WebView2 runtime dependency.
			// bundleCEF: true,
			// defaultRenderer: 'cef',
		},

		// ── Linux platform config ─────────────────────────────────────────────
		linux: {
			// CEF is strongly recommended on Linux — GTK WebKit versions vary
			// wildly between distros and can cause rendering or API inconsistencies.
			// bundleCEF: true,
			// defaultRenderer: 'cef',
		},
	},

	// Runtime values are written into build.json and accessible via BuildConfig.get().
	// Useful for injecting feature flags, environment, or any value the bun process
	// needs to read at startup without re-building.
	runtime: {
		// Quit the app when the last BrowserWindow closes (standard macOS behaviour).
		exitOnLastWindowClosed: true,
	},

	scripts: {
		// postBuild runs after the inner app bundle is assembled (before signing).
		// It copies the Next.js standalone output into the bundle so production
		// builds can self-host the frontend. Skipped for dev builds automatically.
		// See scripts/post-build.ts for details.
		postBuild: './scripts/post-build.ts',
	},

	// Auto-update configuration. Set RELEASE_BASE_URL in CI and uncomment when
	// you're ready to ship updates via the Electrobun updater.
	// release: {
	//   baseUrl: process.env['RELEASE_BASE_URL'] ?? '',
	// },
} satisfies ElectrobunConfig;
