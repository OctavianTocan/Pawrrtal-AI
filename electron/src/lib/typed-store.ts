/**
 * Tiny typed wrapper around electron-store v8.
 *
 * Pinned to `electron-store@^8.2.0` — v9 went ESM-only (`Error
 * [ERR_REQUIRE_ESM]: require() of ES Module … not supported`) and the
 * Electron main bundle is CommonJS. v8 stays fully typed and emits
 * CJS, so `require()` from the compiled `electron/dist/**` works.
 *
 * The wrapper still re-declares the surface we use because the
 * exported `Store` class has a few overloaded methods that don't
 * narrow well from generic types alone.
 */

import { app } from 'electron';
import Store, { type Options } from 'electron-store';

export interface TypedStore<T extends Record<string, unknown>> {
	get<K extends keyof T>(key: K): T[K];
	set<K extends keyof T>(key: K, value: T[K]): void;
	delete<K extends keyof T>(key: K): void;
	clear(): void;
}

/**
 * Construct a typed electron-store instance.
 *
 * `electron-store` normally derives `cwd` from a synchronous IPC
 * roundtrip with the main process (so renderer-instantiated stores
 * land in the same dir). Under Vitest there's no IPC, so we set
 * `cwd` ourselves from `app.getPath('userData')` — which the test
 * mock points at a temp dir per case. v8's `Options` type does not
 * expose `projectName` (it's auto-derived from the host app), so the
 * forwarded options are limited to the `cwd` override + caller opts.
 */
export function createStore<T extends Record<string, unknown>>(options: Options<T>): TypedStore<T> {
	const cwd = app.getPath('userData');
	const finalOptions: Options<T> = {
		cwd,
		...options,
	};
	return new Store<T>(finalOptions) as unknown as TypedStore<T>;
}
