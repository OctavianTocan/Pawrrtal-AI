'use client';

import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useDebugValue,
	useEffect,
	useRef,
	useSyncExternalStore,
} from 'react';

/** Options for {@link usePersistedState}. */
export interface UsePersistedStateOptions<T> {
	/** localStorage key under which the value is persisted. */
	storageKey: string;
	/** Default value used when nothing is persisted (or persistence/validation fails). */
	defaultValue: T;
	/**
	 * Optional runtime validator for the value parsed from storage. Returns
	 * `true` when the parsed value is a valid `T`; on `false`, the stored value
	 * is discarded in favour of `defaultValue`.
	 */
	validate?: (value: unknown) => value is T;
}

/**
 * `useState` backed by `window.localStorage`, hydration-safe by construction.
 *
 * Built on `useSyncExternalStore`: the `getServerSnapshot` callback returns
 * `defaultValue`, so SSR and the first client render always emit identical
 * markup. Cross-tab sync comes for free via the `storage` event plus a custom
 * in-page event so multiple consumers of the same key stay aligned.
 *
 * Storage I/O is wrapped in try/catch because reads can throw in private
 * browsing and writes can throw on quota exhaustion.
 *
 * @param options - The persistence configuration; see
 *   {@link UsePersistedStateOptions}.
 * @returns A `[value, setValue]` tuple with the same semantics as `useState`.
 */
export function usePersistedState<T>(
	options: UsePersistedStateOptions<T>,
): [T, Dispatch<SetStateAction<T>>] {
	const { storageKey, defaultValue, validate } = options;

	const defaultValueRef = useRef(defaultValue);
	defaultValueRef.current = defaultValue;
	const validateRef = useRef(validate);
	validateRef.current = validate;

	const subscribe = useCallback(
		(onChange: () => void) => {
			if (typeof window === 'undefined') return noop;

			const handleStorage = (event: StorageEvent): void => {
				if (event.storageArea === window.localStorage && event.key === storageKey) {
					onChange();
				}
			};
			const handleLocal = (event: Event): void => {
				if ((event as CustomEvent<string>).detail === storageKey) onChange();
			};

			window.addEventListener('storage', handleStorage);
			window.addEventListener(LOCAL_STORAGE_EVENT, handleLocal);
			return () => {
				window.removeEventListener('storage', handleStorage);
				window.removeEventListener(LOCAL_STORAGE_EVENT, handleLocal);
			};
		},
		[storageKey],
	);

	const getSnapshot = useCallback((): T => {
		return readPersistedValue(storageKey, defaultValueRef.current, validateRef.current);
	}, [storageKey]);

	const getServerSnapshot = useCallback((): T => defaultValueRef.current, []);

	const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	useDebugValue(value);

	const setValue = useCallback<Dispatch<SetStateAction<T>>>(
		(updater) => {
			if (typeof window === 'undefined') return;
			const next =
				typeof updater === 'function'
					? (updater as (prev: T) => T)(getSnapshot())
					: updater;
			writePersistedValue(storageKey, next);
			window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: storageKey }));
		},
		[getSnapshot, storageKey],
	);

	// Backfill: if the user has nothing persisted yet, write the default once
	// after mount so the next page-load reads it back instead of bouncing
	// through `defaultValue` on every refresh.
	useEffect(() => {
		if (typeof window === 'undefined') return;
		try {
			if (window.localStorage.getItem(storageKey) === null) {
				writePersistedValue(storageKey, defaultValueRef.current);
			}
		} catch {
			// Private browsing or quota exhausted — silent.
		}
	}, [storageKey]);

	return [value, setValue];
}

const LOCAL_STORAGE_EVENT = 'react-chat-composer-persisted-state:change';

function noop(): void {
	// intentionally empty — stable no-op for SSR/unsubscribe slots
}

/**
 * Per-key cache of `{ raw: lastSeenString, value: parsed }`. Keeps the parsed
 * reference stable across renders — required for `useSyncExternalStore`
 * correctness when the value is an object or array.
 */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function readPersistedValue<T>(
	storageKey: string,
	defaultValue: T,
	validate?: (value: unknown) => value is T,
): T {
	if (typeof window === 'undefined') return defaultValue;

	let rawValue: string | null;
	try {
		rawValue = window.localStorage.getItem(storageKey);
	} catch {
		return defaultValue;
	}

	const cached = snapshotCache.get(storageKey);
	if (cached && cached.raw === rawValue) {
		if (validate && !validate(cached.value)) return defaultValue;
		return cached.value as T;
	}

	let parsed: T;
	if (rawValue === null) {
		parsed = defaultValue;
	} else {
		try {
			const parsedUnknown: unknown = JSON.parse(rawValue);
			parsed = validate && !validate(parsedUnknown) ? defaultValue : (parsedUnknown as T);
		} catch {
			parsed = defaultValue;
		}
	}

	snapshotCache.set(storageKey, { raw: rawValue, value: parsed });
	return parsed;
}

function writePersistedValue<T>(storageKey: string, value: T): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(value));
	} catch {
		// Storage write failed (quota exceeded, private browsing, etc.) — ignore.
	}
}
