/**
 * Fetches the backend's model catalog so the composer's model picker is
 * driven by the server's truth instead of a hardcoded const array.
 *
 * The backend ships a typed catalog at `GET /api/v1/models` (see
 * `backend/app/core/models_catalog.py`).  Before this hook the
 * frontend listed seven model ids — some of which the backend could
 * not actually serve (GPT-5.5 had no provider implementation and fell
 * through to the Google SDK at request time).  Fetching the catalog at
 * the boundary keeps the menu honest and removes the deploy-coupled
 * drift between the two layers.
 *
 * @fileoverview Hook + types for the public model catalog.
 */

import { useAuthedQuery } from '@/hooks/use-authed-query';
import { API_ENDPOINTS } from '@/lib/api';

/** Provider IDs the backend ships an implementation for. */
export type ModelProvider = 'anthropic' | 'google';

/** Discrete reasoning-effort knob — mirrors the backend Literal type. */
export type ModelReasoningEffort = 'off' | 'low' | 'medium' | 'high';

/**
 * One row of the backend's model catalog.  Mirrors
 * `backend.app.schemas.ModelEntryRead` field-for-field — changing one
 * shape without the other will produce a runtime mismatch on the next
 * deploy, which is the intended failure mode (catch in dev, not prod).
 */
export interface CatalogModel {
	/** OpenClaw-style `"<provider>/<model>"` identifier sent back in the chat request body. */
	canonical_id: string;
	/** Which provider backs this model.  Used to pick a logo and group the menu. */
	provider: ModelProvider;
	/** Bare model identifier (no provider prefix).  Surface compatibility for legacy builds. */
	sdk_id: string;
	/** Full label shown in the model menu rows (e.g. "Claude Sonnet 4.6"). */
	display_name: string;
	/** Compact label shown in the composer trigger (e.g. "Sonnet 4.6"). */
	short_name: string;
	/** One-line tagline rendered under the model name. */
	description: string;
	/** Approximate context window in tokens — surfaced as a hint, not a hard limit. */
	context_window: number;
	/** Whether the provider emits reasoning tokens for this model. */
	supports_thinking: boolean;
	/** Whether the model honours the chat router's tool list. */
	supports_tool_use: boolean;
	/** Whether the provider supports server-side prompt caching. */
	supports_prompt_cache: boolean;
	/** Default reasoning effort the backend applies when the request omits one. */
	default_reasoning: ModelReasoningEffort;
}

/** Envelope returned by `GET /api/v1/models`. */
export interface ModelsListResponse {
	/** Models in declaration order — render directly without re-sorting. */
	models: CatalogModel[];
	/** Canonical id of the model the backend picks when no `model_id` is sent. */
	default_canonical_id: string;
}

/** Cache key shared by every `useModels` consumer. */
const MODELS_QUERY_KEY = ['catalog', 'models'] as const;

/**
 * Treat the catalog as effectively static for a session — the backend
 * registry is a compile-time constant, so revalidating on every focus
 * is pure waste.  An hour-long stale window keeps tests fast and stops
 * the dev server from pinging the API on each panel toggle.
 */
const MODELS_STALE_TIME_MS = 60 * 60 * 1000;

/**
 * Fetch the backend's model catalog with React Query caching.
 *
 * @returns React Query result — `data` carries the {@link ModelsListResponse} once loaded.
 *   Consumers should fall back to a sensible default while `isPending`
 *   so the picker can still render before the first response arrives
 *   (Safari fresh-load + slow networks).
 */
export function useModels(): ReturnType<typeof useAuthedQuery<ModelsListResponse>> {
	return useAuthedQuery<ModelsListResponse>(MODELS_QUERY_KEY, API_ENDPOINTS.chat.models, {
		staleTime: MODELS_STALE_TIME_MS,
	});
}
