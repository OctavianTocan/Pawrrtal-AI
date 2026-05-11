/**
 * Helpers used by the chat composer's model selector.
 *
 * @fileoverview Pure data helpers — no React imports. The data themselves
 * (model list, reasoning levels) come from the consumer via
 * {@link ChatComposerProps.models} and `reasoningLevels`. Helpers accept the
 * lists as arguments to keep the package free of hardcoded providers.
 */

import type { ChatModelOption, ChatProviderSlug, ChatReasoningLevel } from '../types/index.js';

/**
 * Discriminated union of root-menu rows (provider groups + the thinking
 * submenu).
 */
export type RootRow =
	| {
			/** Discriminator — the row is a provider group. */
			kind: 'provider';
			/** Provider slug rendered as the group label. */
			provider: ChatProviderSlug;
	  }
	| {
			/** Discriminator — the row is the reasoning submenu. */
			kind: 'thinking';
	  };

/**
 * Builds the ordered list of root rows from a model list + reasoning levels.
 *
 * Provider rows are emitted in the order each provider first appears in
 * `models`. A `thinking` row is appended when reasoning levels are
 * available.
 *
 * @param models - Consumer-supplied model list.
 * @param reasoningLevels - Consumer-supplied reasoning levels. When empty or
 *   undefined the `thinking` row is omitted.
 * @returns The root rows in render order.
 */
export function buildRootRows(
	models: ChatModelOption[] | undefined,
	reasoningLevels: ChatReasoningLevel[] | undefined,
): RootRow[] {
	const rows: RootRow[] = [];
	const seen = new Set<string>();
	for (const model of models ?? []) {
		if (seen.has(model.provider)) continue;
		seen.add(model.provider);
		rows.push({ kind: 'provider', provider: model.provider });
	}
	if (reasoningLevels && reasoningLevels.length > 0) {
		rows.push({ kind: 'thinking' });
	}
	return rows;
}

/**
 * Stable React key for each root row.
 *
 * @param row - The root-menu row.
 * @returns A unique-per-row string suitable for `key` props.
 */
export function rootRowKey(row: RootRow): string {
	return row.kind === 'provider' ? `provider:${row.provider}` : 'thinking';
}

/**
 * Display string used by keyboard type-ahead matching.
 *
 * @param row - The root-menu row.
 * @returns A human-readable label.
 */
export function rootRowDisplay(row: RootRow): string {
	return row.kind === 'provider' ? providerLabel(row.provider) : 'Thinking';
}

/**
 * Title-cases a provider slug for display. Known providers get their
 * canonical capitalization; everything else is rendered as the raw slug.
 *
 * @param provider - The provider slug to format.
 * @returns The provider display label.
 */
export function providerLabel(provider: ChatProviderSlug): string {
	const KNOWN: Record<string, string> = {
		anthropic: 'Anthropic',
		openai: 'OpenAI',
		google: 'Google',
		mistral: 'Mistral',
		xai: 'xAI',
		meta: 'Meta',
		deepseek: 'DeepSeek',
		qwen: 'Qwen',
	};
	return KNOWN[provider] ?? provider;
}

/**
 * Resolves a model ID to its option entry; returns `undefined` when the ID
 * is not present in the list.
 *
 * @param models - Consumer-supplied model list.
 * @param modelId - The persisted/selected model identifier.
 * @returns The matching `ChatModelOption`, or `undefined`.
 */
export function getModelOption(
	models: ChatModelOption[] | undefined,
	modelId: string | undefined,
): ChatModelOption | undefined {
	if (!models || !modelId) return undefined;
	return models.find((model) => model.id === modelId);
}

/**
 * Resolves a reasoning level to a display label. Reasoning levels are
 * already strings so the label is the level itself unless the consumer has
 * supplied an override map (which the package does not implement today —
 * call this with a custom mapper at the consumer site if needed).
 *
 * @param reasoning - The selected reasoning level, if any.
 * @returns The reasoning label, or `''` when nothing is selected.
 */
export function getReasoningLabel(reasoning: string | undefined): string {
	return reasoning ?? '';
}

/**
 * Returns the subset of `models` belonging to a provider, preserving the
 * input order.
 *
 * @param models - Consumer-supplied model list.
 * @param provider - The provider slug to filter by.
 * @returns Models authored by `provider`.
 */
export function getModelsByProvider(
	models: ChatModelOption[] | undefined,
	provider: ChatProviderSlug,
): ChatModelOption[] {
	if (!models) return [];
	return models.filter((model) => model.provider === provider);
}
