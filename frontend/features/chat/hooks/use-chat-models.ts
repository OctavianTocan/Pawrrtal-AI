import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { z } from 'zod';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { API_ENDPOINTS } from '@/lib/api';

/**
 * Query key used by {@link useChatModels} and any cache mutator that
 * needs to invalidate the catalog (e.g. an admin tool flipping a
 * `is_default` flag).
 */
export const CHAT_MODELS_QUERY_KEY = ['models'] as const;

/** One entry from `GET /api/v1/models`. */
export interface ChatModelOption {
	/** Canonical wire form: `host:vendor/model` (e.g. `agent-sdk:anthropic/claude-sonnet-4-6`). */
	id: string;
	/** Where the model runs (e.g. `agent-sdk`, `google-ai`). */
	host: string;
	/** Vendor segment of the canonical ID (e.g. `anthropic`, `google`, `openai`). */
	vendor: string;
	/** Vendor's own slug (e.g. `claude-sonnet-4-6`). */
	model: string;
	/** Long display name shown in the picker. */
	display_name: string;
	/** Short label for mobile / compact contexts. */
	short_name: string;
	/** Marketing-style description rendered under the model name. */
	description: string;
	/** True for exactly one entry — the catalog's default selection. */
	is_default: boolean;
}

/** Return shape for {@link useChatModels}. */
export interface UseChatModelsResult {
	/** Catalog entries; empty array while the request is in flight. */
	models: readonly ChatModelOption[];
	/** The entry with `is_default: true`; `null` while loading or if the catalog has no default. */
	default: ChatModelOption | null;
	/** True until the first response (success or error) lands. */
	isLoading: boolean;
	/** Latest fetch / validation error, or `null` when healthy. */
	error: Error | null;
}

/**
 * Zod schema for one catalog entry — must stay in sync with the backend
 * `ChatModelOption` Pydantic model. Boundary validation per the
 * `validate-response-shape-at-boundary` rule.
 */
const ModelOptionSchema = z.object({
	id: z.string(),
	host: z.string(),
	vendor: z.string(),
	model: z.string(),
	display_name: z.string(),
	short_name: z.string(),
	description: z.string(),
	is_default: z.boolean(),
});

/** Zod schema for the `GET /api/v1/models` response envelope. */
const ModelsResponseSchema = z.object({
	models: z.array(ModelOptionSchema),
});

/**
 * Fetches the backend model catalog via TanStack Query.
 *
 * `staleTime: Infinity` keeps the catalog cached for the session.
 * `GET /api/v1/models` exposes an ETag and `Cache-Control:
 * private, must-revalidate`, so the rare revalidation (e.g. on
 * window focus when the cache is later invalidated) is cheap.
 *
 * This hook does **not** use {@link useAuthedQuery} because the
 * shared helper has no `validate` hook for Zod parsing — we call
 * `useAuthedFetch` directly inside the `queryFn` and run the parse
 * there, mirroring the boundary-validation pattern from
 * `frontend/hooks/get-conversations.ts`.
 *
 * @returns Catalog data, the default entry, loading flag, and the
 *   latest error (or `null` while healthy).
 */
export function useChatModels(): UseChatModelsResult {
	const authedFetch = useAuthedFetch();

	const query = useQuery<{ models: ChatModelOption[] }>({
		queryKey: CHAT_MODELS_QUERY_KEY,
		staleTime: Number.POSITIVE_INFINITY,
		queryFn: async (): Promise<{ models: ChatModelOption[] }> => {
			// `useAuthedFetch` throws on non-OK responses, so we only need to
			// parse the body here.
			const response = await authedFetch(API_ENDPOINTS.chat.models);
			const raw: unknown = await response.json();
			return ModelsResponseSchema.parse(raw);
		},
	});

	const models = query.data?.models ?? [];
	const defaultEntry = useMemo<ChatModelOption | null>(
		() => models.find((model) => model.is_default) ?? null,
		[models]
	);

	return {
		models,
		default: defaultEntry,
		isLoading: query.isLoading,
		error: query.error ?? null,
	};
}
