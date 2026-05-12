/**
 * Lightweight persistent JSON store for Pawrrtal's Electrobun shell.
 *
 * Replaces `electron-store` (which is Node/Electron-specific) with a
 * simple typed wrapper around Bun's file I/O. Each store is a single
 * JSON file under the Pawrrtal data directory:
 *   macOS:   ~/Library/Application Support/Pawrrtal/<name>.json
 *   Linux:   ~/.local/share/Pawrrtal/<name>.json
 *   Windows: %APPDATA%\Pawrrtal\<name>.json
 *
 * API is intentionally compatible with the electron-store subset we
 * actually use (`get`, `set`), so porting workspace.ts / permissions.ts
 * is a drop-in rename.
 *
 * @module
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import path from 'node:path';

/** Resolve the platform-appropriate user data directory. */
export function getDataDir(): string {
	const home = homedir();
	switch (platform()) {
		case 'darwin':
			return path.join(home, 'Library', 'Application Support', 'Pawrrtal');
		case 'win32':
			return path.join(
				process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming'),
				'Pawrrtal'
			);
		default:
			// Linux / BSD — follow XDG
			return path.join(
				process.env.XDG_DATA_HOME ?? path.join(home, '.local', 'share'),
				'Pawrrtal'
			);
	}
}

export interface StoreOptions<T extends Record<string, unknown>> {
	/** Filename (without .json) under the data directory. Defaults to "store". */
	name?: string;
	/** Default values merged when the store file doesn't exist yet. */
	defaults: T;
	/**
	 * Override the data directory — used in tests to write into a tmp dir
	 * instead of ~/Library/Application Support.
	 */
	dataDir?: string;
}

export class Store<T extends Record<string, unknown>> {
	private readonly filePath: string;
	private data: T;

	constructor(options: StoreOptions<T>) {
		const dir = options.dataDir ?? getDataDir();
		mkdirSync(dir, { recursive: true });
		this.filePath = path.join(dir, `${options.name ?? 'store'}.json`);
		this.data = this.load(options.defaults);
	}

	private load(defaults: T): T {
		try {
			const raw = readFileSync(this.filePath, 'utf-8');
			return { ...defaults, ...JSON.parse(raw) } as T;
		} catch {
			// File doesn't exist yet or is malformed — start from defaults.
			return { ...defaults };
		}
	}

	private flush(): void {
		writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
	}

	get<K extends keyof T>(key: K): T[K] {
		return this.data[key];
	}

	set<K extends keyof T>(key: K, value: T[K]): void {
		this.data[key] = value;
		this.flush();
	}

	/** Test-only: replace the underlying data without touching disk. */
	_resetToDefaults(defaults: T): void {
		this.data = { ...defaults };
	}
}

/** Factory matching the electron-store `createStore` helper in the Electron shell. */
export function createStore<T extends Record<string, unknown>>(options: StoreOptions<T>): Store<T> {
	return new Store(options);
}
