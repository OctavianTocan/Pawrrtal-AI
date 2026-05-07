/**
 * macOS `titleBarStyle` for `BrowserWindow` — edit here only; keep in sync with
 * `createWindow` in `main.ts` (single place to switch chrome strategy).
 *
 * **`default`** — full-size AppKit traffic lights in the standard title strip
 * above the page. **`hidden`** / **`hiddenInset`** draw smaller overlay controls
 * inside the web view; if you switch to those, add matching left padding to the
 * in-app header in the frontend yourself — we do not mirror this into preload.
 */

import type { BrowserWindowConstructorOptions } from 'electron';

/** Must match `titleBarStyle` passed to `BrowserWindow` on darwin. */
export const MACOS_TITLE_BAR_STYLE: NonNullable<BrowserWindowConstructorOptions['titleBarStyle']> =
	'default';
