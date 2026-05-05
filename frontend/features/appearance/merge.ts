/**
 * Merge persisted appearance overrides on top of the Mistral defaults.
 *
 * Centralized here so the React provider and tests share the exact
 * same overlay logic. The merge is shallow per slot — a `null` /
 * missing value falls back to the default; a present value wins.
 */

import { DEFAULT_APPEARANCE } from './defaults';
import type { AppearanceSettings, ResolvedAppearance } from './types';

/**
 * Resolve a partial `AppearanceSettings` against the system defaults.
 *
 * Accepts an optional `overrides` so the provider can call this with
 * `undefined` while the API query is loading and still get a valid,
 * fully-populated `ResolvedAppearance` to drive CSS variables.
 */
export function resolveAppearance(overrides: AppearanceSettings | undefined): ResolvedAppearance {
	if (!overrides) {
		return DEFAULT_APPEARANCE;
	}

	return {
		light: { ...DEFAULT_APPEARANCE.light, ...stripNulls(overrides.light) },
		dark: { ...DEFAULT_APPEARANCE.dark, ...stripNulls(overrides.dark) },
		fonts: { ...DEFAULT_APPEARANCE.fonts, ...stripNulls(overrides.fonts) },
		options: { ...DEFAULT_APPEARANCE.options, ...stripNulls(overrides.options) },
	} as ResolvedAppearance;
}

/**
 * Strip `null` / `undefined` from a partial record so spreading it on
 * top of the defaults doesn't blast a real value back to null.
 *
 * Why this exists: the backend returns ``null`` for unset optional
 * fields (Pydantic's default), and naive ``{...defaults, ...overrides}``
 * would overwrite a perfectly good default with that null.
 *
 * Typed against `object` instead of `Record<string, unknown>` so the
 * three sub-models (`ThemeColors`, `AppearanceFonts`,
 * `AppearanceOptions`) — each with a different key set — can be
 * passed through the same helper.
 */
function stripNulls<T extends object>(record: T | undefined | null): Partial<T> {
	if (!record) return {};
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
		if (value !== null && value !== undefined) {
			out[key] = value;
		}
	}
	return out as Partial<T>;
}
