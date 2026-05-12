'use client';

import { ReactQueryDevtools as RQDevtools } from '@tanstack/react-query-devtools';
import { useSyncExternalStore } from 'react';

const subscribeToHydration = (): (() => void) => () => {};
const getClientHydrationSnapshot = (): boolean => true;
const getServerHydrationSnapshot = (): boolean => false;

/**
 * Client-only wrapper around `ReactQueryDevtools`.
 *
 * Why this file exists:
 *
 * In Next 16 + React 19 + Turbopack, rendering `<ReactQueryDevtools>` as a
 * direct child of `<QueryClientProvider>` inside a `'use client'` boundary
 * occasionally throws a fatal "No QueryClient set" runtime error during dev
 * startup.  The crash blocks the entire tree from hydrating, so the rest of
 * the app cannot be loaded until the dev server is restarted (and even then
 * the error often returns).  The root cause is suspected to be a context
 * identity mismatch when the devtools subscribe to the `QueryClient` while
 * Turbopack is still wiring the module graph — devtools resolve their own
 * copy of the query-core context before `<QueryClientProvider>` has installed
 * the runtime instance.
 *
 * Mounting devtools only after the first client effect (post-hydration) and
 * only in development sidesteps the race entirely: by the time `mounted` is
 * true, `<QueryClientProvider>` has been committed and the devtools find the
 * client they expect.  Production builds never render this component because
 * `process.env.NODE_ENV` is statically replaced at build time, so the
 * devtools bundle is dead-code-eliminated.
 *
 * Reported by the operator on 2026-05-08 against
 * `frontend/app/providers.tsx:28` ("No QueryClient set").
 */
export function QueryDevtools() {
	const mounted = useSyncExternalStore(
		subscribeToHydration,
		getClientHydrationSnapshot,
		getServerHydrationSnapshot
	);

	if (!mounted || process.env.NODE_ENV !== 'development') {
		return null;
	}

	return <RQDevtools initialIsOpen={false} />;
}
