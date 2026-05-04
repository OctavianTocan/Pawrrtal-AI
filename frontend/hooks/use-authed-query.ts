import { type QueryKey, useQuery } from '@tanstack/react-query';
import { useAuthedFetch } from './use-authed-fetch';

/**
 * `useQuery` bound to {@link useAuthedFetch}: JSON GET with cookie auth and shared 401 handling.
 *
 * @typeParam T - Parsed JSON type of the response body.
 * @param queryKey - React Query cache key (include all values that should invalidate the fetch).
 * @param endpoint - API path appended to the configured backend origin (see `lib/api.ts`).
 */
export function useAuthedQuery<T>(queryKey: QueryKey, endpoint: string) {
	const authedFetch = useAuthedFetch();
	return useQuery<T>({
		queryKey,
		queryFn: async () => {
			const response = await authedFetch(endpoint);
			return response.json();
		},
	});
}
