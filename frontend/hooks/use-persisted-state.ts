'use client';

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';

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
 * **Hydration model:** the first render — both on the server and on the client —
 * always returns `defaultValue`. The persisted value is loaded inside a mount
 * effect and committed via `setValue`, which triggers a second client render.
 * This is the only safe pattern: reading `localStorage` synchronously during
 * the initializer would diverge from the SSR'd HTML and break hydration on
 * any consumer that renders the value (e.g. the model name in the composer).
 *
 * Storage I/O is wrapped in try/catch because reads can throw in private
 * browsing or when storage access is blocked, and writes can throw on quota
 * exhaustion. When a `validate` guard is provided, persisted values that fail
 * validation are silently discarded in favour of `defaultValue` — protects
 * against renamed enum members still living in older users' storage.
 */
export function usePersistedState<T>(
	options: UsePersistedStateOptions<T>
): [T, Dispatch<SetStateAction<T>>] {
	const { storageKey, defaultValue, validate } = options;

	const [value, setValue] = useState<T>(defaultValue);
	// Don't write back to storage until after the read-on-mount has run —
	// otherwise the first render's `defaultValue` would clobber whatever the
	// user previously persisted.
	const [isHydrated, setIsHydrated] = useState(false);

	// Refs let the hydration effect see the *latest* defaultValue / validate
	// without forcing those into its dep array. If callers pass new function
	// identities every render (common for `validate`), depending on them would
	// cause the effect to re-fire and clobber a user-set value mid-session.
	const defaultValueRef = useRef(defaultValue);
	defaultValueRef.current = defaultValue;
	const validateRef = useRef(validate);
	validateRef.current = validate;

	// Hydrate from localStorage on mount, or whenever the storage key itself
	// changes. The first render — server and client — always returns
	// `defaultValue` so SSR markup matches; this effect commits the persisted
	// value on the second client render.
	useEffect(() => {
		const persisted = readPersistedValue(
			storageKey,
			defaultValueRef.current,
			validateRef.current
		);
		setValue(persisted);
		setIsHydrated(true);
	}, [storageKey]);

	useEffect(() => {
		if (!isHydrated || typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(value));
		} catch {
			// Storage write failed (quota exceeded, private browsing, etc.) — ignore.
		}
	}, [isHydrated, storageKey, value]);

	return [value, setValue];
}

/**
 * Read and validate a value from `localStorage`, falling back to `defaultValue`
 * when the entry is missing, unparseable, or fails the optional `validate` guard.
 *
 * Kept as a free function so the hydration effect stays a single expression.
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
