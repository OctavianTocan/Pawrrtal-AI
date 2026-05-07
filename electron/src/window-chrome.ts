/**
 * Single source of truth for macOS BrowserWindow chrome options and matching
 * renderer inset math. Keep {@link MACOS_TITLE_BAR_STYLE} aligned with
 * `BrowserWindow` in `main.ts` — `preload.ts` imports these values so the
 * frontend can reserve space when overlay traffic lights draw inside the web
 * content region (`hidden` / `hiddenInset`).
 *
 * Use **`default`** for full-size AppKit traffic lights (standard macOS title
 * strip above the page). Overlay styles paint smaller Chromium-emulated
 * controls — see `electron/README.md`.
 */

import type { BrowserWindowConstructorOptions } from 'electron';

/** Must match `titleBarStyle` passed to `BrowserWindow` on darwin. */
export const MACOS_TITLE_BAR_STYLE: NonNullable<BrowserWindowConstructorOptions['titleBarStyle']> =
	'default';

/**
 * Horizontal padding for the in-app toolbar when traffic lights overlay web
 * content (non-`default` styles). Tune if Apple/Electron shift standard spacing.
 */
export const MACOS_TRAFFIC_LIGHT_LEFT_INSET_PX = 78;
