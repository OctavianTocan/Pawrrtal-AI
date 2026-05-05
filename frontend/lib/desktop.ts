/**
 * Single typed entrypoint for desktop-only features.
 *
 * The Electron preload script (`electron/src/preload.ts`) injects an
 * `aiNexus` object onto `window` via `contextBridge`. This module is
 * the FE's only allowed reader of that object — every component that
 * wants to call into the desktop shell goes through here so we have:
 *
 *   1. **One detection point** for `isDesktop()` (no per-component
 *      `typeof window.aiNexus` checks scattered through the codebase).
 *   2. **Web-safe fallbacks** for every method, so the same call site
 *      works in both shells (e.g. `openExternal` falls back to
 *      `window.open(...)` in the browser).
 *   3. **Typed surface** mirroring the preload's `DesktopApi` type
 *      without a build-time dependency on the Electron workspace.
 */

/**
 * Bridge surface exposed by `electron/src/preload.ts`. Mirrored here
 * (rather than imported) because the frontend doesn't depend on the
 * Electron workspace at compile time — the bridge is a runtime
 * contract validated at the seam.
 */
interface DesktopBridge {
	openExternal: (url: string) => Promise<void>;
	showOpenFolderDialog: () => Promise<string | null>;
	getPlatform: () => Promise<NodeJS.Platform>;
	getVersion: () => Promise<string>;
	onMenuNewChat: (handler: () => void) => () => void;
}

declare global {
	interface Window {
		/** Present only when running inside the Electron desktop shell. */
		aiNexus?: DesktopBridge;
	}
}

/** True when the app is running inside the Electron desktop shell. */
export function isDesktop(): boolean {
	return typeof window !== 'undefined' && typeof window.aiNexus !== 'undefined';
}

/**
 * Open `url` in the user's default browser on desktop, or in a new tab
 * on web. Always swallow failures — opening a link must never crash
 * the calling component.
 */
export async function openExternal(url: string): Promise<void> {
	try {
		if (window.aiNexus) {
			await window.aiNexus.openExternal(url);
			return;
		}
		window.open(url, '_blank', 'noopener,noreferrer');
	} catch {
		/* swallow — link-opening must never throw */
	}
}

/**
 * Show a native folder picker on desktop, or `null` on web (the
 * browser has no equivalent that can return a real filesystem path —
 * `<input type="file" webkitdirectory>` only exposes file blobs).
 */
export async function showOpenFolderDialog(): Promise<string | null> {
	if (window.aiNexus) return window.aiNexus.showOpenFolderDialog();
	return null;
}

/** Resolve the host platform; returns 'web' when not running in Electron. */
export async function getPlatform(): Promise<NodeJS.Platform | 'web'> {
	if (window.aiNexus) return window.aiNexus.getPlatform();
	return 'web';
}

/** Resolve the desktop app version, or `null` on web. */
export async function getDesktopVersion(): Promise<string | null> {
	if (window.aiNexus) return window.aiNexus.getVersion();
	return null;
}

/**
 * Subscribe to "user picked File → New chat" from the native menu.
 * No-op + null unsubscribe on web.
 */
export function onMenuNewChat(handler: () => void): () => void {
	if (window.aiNexus) return window.aiNexus.onMenuNewChat(handler);
	return () => {
		/* no-op on web */
	};
}
