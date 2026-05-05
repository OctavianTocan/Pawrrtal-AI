/**
 * Tiny typed wrapper around electron-store v10.
 *
 * `electron-store@10` extends `conf` whose class has a `#private`
 * field; TypeScript drops the inherited `get`/`set`/`delete`/`clear`
 * methods through that extension, so direct calls on the constructed
 * store fail to type-check. This wrapper re-declares the surface we
 * actually use, validated at runtime by the underlying instance.
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
 * `projectName` is normally derived from the running app's
 * package.json by `conf` (electron-store's underlying lib). Under a
 * packaged build that works; under Vitest with a mocked Electron
 * `app` it does not. Setting it explicitly from `app.getName()` makes
 * the same code path run in both environments.
 */
export function createStore<T extends Record<string, unknown>>(options: Options<T>): TypedStore<T> {
	// `electron-store` normally derives `cwd` from a synchronous IPC
	// roundtrip with the main process (so renderer-instantiated stores
	// land in the same dir). Under Vitest there's no IPC, so we set
	// `cwd` ourselves from `app.getPath('userData')` — which the test
	// mock points at a temp dir per case.
	const cwd = app.getPath('userData');
	const finalOptions: Options<T> = {
		projectName: app.getName(),
		cwd,
		...options,
	};
	return new Store<T>(finalOptions) as unknown as TypedStore<T>;
}
