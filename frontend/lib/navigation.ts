/**
 * Compatibility shim mapping Next.js' `next/navigation` API surface
 * onto TanStack Router.
 *
 * Why: keeping the call-site signatures stable across the migration
 * means the diff is one-line per file (`from 'next/navigation'` →
 * `from '@/lib/navigation'`) instead of rewriting every router.push
 * call.  Once the codebase has settled, individual sites can move to
 * native TanStack APIs (`useNavigate`, route IDs as types, search
 * param parsers, etc.) and we can delete this shim.
 *
 * Tests mock this module via vitest's `vi.mock('@/lib/navigation', ...)`
 * in `test/setup.ts` so components rendered outside a `<RouterProvider>`
 * don't blow up trying to look up a real router.
 */

import {
	useNavigate,
	useLocation,
	useRouter as useTanStackRouter,
	useSearch,
} from '@tanstack/react-router';
import { useMemo } from 'react';

/**
 * Subset of Next.js' AppRouterInstance we actually use across the app.
 */
export interface AppRouterShim {
	push: (href: string) => void;
	replace: (href: string) => void;
	back: () => void;
	forward: () => void;
	refresh: () => void;
	prefetch: (href: string) => void;
}

/**
 * Drop-in replacement for `next/navigation`'s `useRouter`.
 */
export function useRouter(): AppRouterShim {
	const navigate = useNavigate();
	const tanstackRouter = useTanStackRouter();

	return useMemo<AppRouterShim>(
		() => ({
			push: (href) => {
				void navigate({ to: href });
			},
			replace: (href) => {
				void navigate({ to: href, replace: true });
			},
			back: () => {
				tanstackRouter.history.back();
			},
			forward: () => {
				tanstackRouter.history.forward();
			},
			refresh: () => {
				void tanstackRouter.invalidate();
			},
			prefetch: () => {
				/* no-op: TanStack preloads via Link preload="intent". */
			},
		}),
		[navigate, tanstackRouter],
	);
}

/**
 * Drop-in replacement for `next/navigation`'s `usePathname`.
 */
export function usePathname(): string {
	return useLocation().pathname;
}

/**
 * Drop-in replacement for `next/navigation`'s `useSearchParams`.
 *
 * Returns a `URLSearchParams` so `.get('q')` keeps working.  TanStack's
 * native `useSearch()` returns a typed object, but route-level typed
 * parsing is its own migration; for now we serialize the search object
 * back through `URLSearchParams` so existing call sites are unchanged.
 */
export function useSearchParams(): URLSearchParams {
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	return useMemo(() => {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(search)) {
			if (v === undefined || v === null) continue;
			if (Array.isArray(v)) {
				for (const item of v) params.append(k, String(item));
			} else {
				params.set(k, String(v));
			}
		}
		return params;
	}, [search]);
}
