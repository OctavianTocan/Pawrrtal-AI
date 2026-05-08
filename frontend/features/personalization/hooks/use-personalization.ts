
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { useAuthedQuery } from '@/hooks/use-authed-query';
import { API_ENDPOINTS } from '@/lib/api';
import type { PersonalizationProfile } from '../storage';

/** Cache key shared by `useGetPersonalization` + the upsert invalidate. */
const PERSONALIZATION_QUERY_KEY = ['personalization'] as const;

/**
 * Maps backend snake_case fields to the frontend's camelCase
 * `PersonalizationProfile` shape. Lives in the hook layer so the
 * storage module can stay framework-free + React-Query-free for
 * non-rendering imports.
 */
interface BackendPersonalization {
	name?: string | null;
	company_website?: string | null;
	linkedin?: string | null;
	role?: string | null;
	goals?: string[] | null;
	connected_channels?: string[] | null;
	chatgpt_context?: string | null;
	personality?: string | null;
	custom_instructions?: string | null;
}

function fromBackend(payload: BackendPersonalization): PersonalizationProfile {
	return {
		name: payload.name ?? undefined,
		companyWebsite: payload.company_website ?? undefined,
		linkedin: payload.linkedin ?? undefined,
		role: payload.role ?? undefined,
		goals: payload.goals ?? undefined,
		connectedChannels:
			(payload.connected_channels as PersonalizationProfile['connectedChannels']) ??
			undefined,
		chatgptContext: payload.chatgpt_context ?? undefined,
		personality: (payload.personality as PersonalizationProfile['personality']) ?? undefined,
		customInstructions: payload.custom_instructions ?? undefined,
	};
}

function toBackend(profile: PersonalizationProfile): BackendPersonalization {
	return {
		name: profile.name ?? null,
		company_website: profile.companyWebsite ?? null,
		linkedin: profile.linkedin ?? null,
		role: profile.role ?? null,
		goals: profile.goals ?? null,
		connected_channels: profile.connectedChannels ?? null,
		chatgpt_context: profile.chatgptContext ?? null,
		personality: profile.personality ?? null,
		custom_instructions: profile.customInstructions ?? null,
	};
}

/**
 * Read the authenticated user's personalization profile from the
 * backend. Falls back to an empty profile when the user hasn't filled
 * the wizard yet.
 */
export function useGetPersonalization(): ReturnType<typeof useAuthedQuery<PersonalizationProfile>> {
	return useAuthedQuery<PersonalizationProfile>(
		PERSONALIZATION_QUERY_KEY,
		API_ENDPOINTS.personalization.get
	);
}

/**
 * Replace the authenticated user's personalization profile. PUT, so the
 * backend treats the payload as a full replacement — partial submits
 * still need to send every field the wizard has captured so far.
 */
export function useUpsertPersonalization(): UseMutationResult<
	PersonalizationProfile,
	Error,
	PersonalizationProfile
> {
	const fetcher = useAuthedFetch();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['personalization', 'upsert'],
		mutationFn: async (profile: PersonalizationProfile): Promise<PersonalizationProfile> => {
			const response = await fetcher(API_ENDPOINTS.personalization.put, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(toBackend(profile)),
			});
			const json = (await response.json()) as BackendPersonalization;
			return fromBackend(json);
		},
		onSuccess: (next) => {
			queryClient.setQueryData<PersonalizationProfile>(PERSONALIZATION_QUERY_KEY, next);
		},
	});
}
