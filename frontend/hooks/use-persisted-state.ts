'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * Options for {@link usePersistedState}.
 */
export interface UsePersistedStateOptions<T> {
	/** localStorage key under which the value is persisted. */
	storageKey: string;
	/** Default value used when nothing is persisted (or persistence/validation fails). */
	defaultValue: T;
	/**
	 * Optional runtime validator for the value parsed from storage.
	 *
	 * Returns `true` if the parsed value is a valid `T`. When omitted, any successfully
	 * parsed JSON value is accepted, which is fine for primitives but unsafe for typed
	 * unions — pass a guard whenever the on-disk shape might drift (renamed enum members,
	 * stale users, manual edits in DevTools).
	 */
	validate?: (value: unknown) => value is T;
}

/**
 * `useState` backed by `window.localStorage`.
 *
 * - SSR-safe: the initializer reads `localStorage` only when `window` is defined,
 *   so the first render on the server returns `defaultValue`.
 * - Storage I/O is wrapped in try/catch because reads can throw in private browsing
 *   or when storage access is blocked, and writes can throw on quota exhaustion.
 * - When a `validate` guard is provided, persisted values that fail validation are
 *   silently discarded in favour of `defaultValue` — protects against renamed enum
 *   members from older app versions still living in user storage.
 */
export function usePersistedState<T>(
	options: UsePersistedStateOptions<T>
): [T, Dispatch<SetStateAction<T>>] {
	const { storageKey, defaultValue, validate } = options;

	const [value, setValue] = useState<T>(() =>
		readPersistedValue(storageKey, defaultValue, validate)
	);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		try {
			window.localStorage.setItem(storageKey, JSON.stringify(value));
		} catch {
			// Storage write failed (quota exceeded, private browsing, etc.) — ignore.
		}
	}, [storageKey, value]);

	return [value, setValue];
}

/**
 * Reads and validates a value from `localStorage`, falling back to `defaultValue`
 * when the entry is missing, unparseable, or fails the optional `validate` guard.
 *
 * Kept as a free function (instead of inlining) so the lazy `useState` initializer
 * stays a single expression.
 */
function readPersistedValue<T>(
	storageKey: string,
	defaultValue: T,
	validate?: (value: unknown) => value is T
): T {
	if (typeof window === 'undefined') {
		return defaultValue;
	}

	try {
		const rawValue = window.localStorage.getItem(storageKey);
		if (rawValue === null) {
			return defaultValue;
		}

		const parsedValue: unknown = JSON.parse(rawValue);

		if (validate && !validate(parsedValue)) {
			return defaultValue;
		}

		return parsedValue as T;
	} catch {
		return defaultValue;
	}
}
