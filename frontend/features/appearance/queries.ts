'use client';

/**
 * TanStack Query hooks for the per-user appearance settings.
 *
 * Server state — uses TanStack Query (not `usePersistedState`) per the
 * project convention: server-owned data goes through Query, client UI
 * prefs go through localStorage. The persisted appearance row is
 * server-owned, so live updates from another tab / device propagate
 * via a refetch on focus.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import type { AppearanceSettings } from './types';

/** Cache key for the authenticated user's appearance settings. */
export const APPEARANCE_QUERY_KEY = ['appearance'] as const;

/**
 * Fetch the persisted appearance overrides for the authenticated user.
 *
 * Returns an empty `AppearanceSettings` (all sub-models empty) when the
 * user has never customized — the merge layer in `merge.ts` resolves
 * that to the Mistral defaults.
 */
export function useAppearance() {
	const authedFetch = useAuthedFetch();
	return useQuery<AppearanceSettings>({
		queryKey: APPEARANCE_QUERY_KEY,
		queryFn: async () => {
			const response = await authedFetch('/api/v1/appearance');
			return (await response.json()) as AppearanceSettings;
		},
		// The user can change this from any device; refetch on focus so
		// the open tab eventually catches up without a manual reload.
		refetchOnWindowFocus: true,
		staleTime: 30_000,
	});
}

/**
 * Replace the authenticated user's appearance settings.
 *
 * The mutation is full-replacement — the caller passes the entire
 * resolved settings object, not a diff. That matches the backend's PUT
 * semantics and keeps the partial-merge logic centralized in
 * `merge.ts`.
 */
export function useUpdateAppearance() {
	const authedFetch = useAuthedFetch();
	const queryClient = useQueryClient();

	return useMutation<AppearanceSettings, Error, AppearanceSettings>({
		mutationFn: async (next) => {
			const response = await authedFetch('/api/v1/appearance', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(next),
			});
			return (await response.json()) as AppearanceSettings;
		},
		onMutate: async (next) => {
			// Optimistic cache update so the panel feels instant.
			await queryClient.cancelQueries({ queryKey: APPEARANCE_QUERY_KEY });
			const previous = queryClient.getQueryData<AppearanceSettings>(APPEARANCE_QUERY_KEY);
			queryClient.setQueryData(APPEARANCE_QUERY_KEY, next);
			return { previous };
		},
		onError: (_error, _next, context) => {
			// Roll back if the server rejected the payload.
			const ctx = context as { previous?: AppearanceSettings } | undefined;
			if (ctx?.previous) {
				queryClient.setQueryData(APPEARANCE_QUERY_KEY, ctx.previous);
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: APPEARANCE_QUERY_KEY });
		},
	});
}

/**
 * Reset the authenticated user's appearance back to the Mistral defaults.
 *
 * Hits `DELETE /api/v1/appearance`, which removes the persisted row
 * server-side. The cache is reset to an empty settings object so the
 * provider re-resolves to defaults on the next render.
 */
export function useResetAppearance() {
	const authedFetch = useAuthedFetch();
	const queryClient = useQueryClient();

	return useMutation<void, Error, void>({
		mutationFn: async () => {
			await authedFetch('/api/v1/appearance', { method: 'DELETE' });
		},
		onSuccess: () => {
			// Empty payload → merge layer resolves everything to defaults.
			const empty: AppearanceSettings = {
				light: {},
				dark: {},
				fonts: {},
				options: {},
			};
			queryClient.setQueryData(APPEARANCE_QUERY_KEY, empty);
		},
	});
}
