/**
 * Whimsy preset patterns — pre-laid-out, tileable SVG masks.
 *
 * The 33 SVG files under `public/whimsy-patterns/pattern-{1..33}.svg` were
 * extracted from Telegram for Android 5.14.0 (sourced via
 * https://blog.1a23.com/2020/02/13/telegram-chat-backgrounds-patterns-extracted/).
 * They are monochrome black-on-transparent line drawings; we render them
 * via CSS `mask-image` so the user's theme colour drives the rendered hue.
 *
 * Unlike the generator in `whimsy-tile.ts`, presets are static art —
 * `seed`, `density`, and `grid` are meaningless for them. The user picks a
 * preset and we mask it onto the background. `tile size` and `opacity` still
 * apply because they affect rendering, not the SVG's contents.
 *
 * Provenance + licensing note: these assets are Telegram's IP. They're
 * shipped here on the same basis as a third-party Telegram client — fair
 * use for end-user customisation. If we ever publish this product
 * commercially, run a clearance pass before relying on them as defaults.
 */

/** Identifier matching the file name under `public/whimsy-patterns/`. */
export type WhimsyPresetId =
	| 'pattern-1'
	| 'pattern-2'
	| 'pattern-3'
	| 'pattern-4'
	| 'pattern-5'
	| 'pattern-6'
	| 'pattern-7'
	| 'pattern-8'
	| 'pattern-9'
	| 'pattern-10'
	| 'pattern-11'
	| 'pattern-12'
	| 'pattern-13'
	| 'pattern-14'
	| 'pattern-15'
	| 'pattern-16'
	| 'pattern-17'
	| 'pattern-18'
	| 'pattern-19'
	| 'pattern-20'
	| 'pattern-21'
	| 'pattern-22'
	| 'pattern-23'
	| 'pattern-24'
	| 'pattern-25'
	| 'pattern-26'
	| 'pattern-27'
	| 'pattern-28'
	| 'pattern-29'
	| 'pattern-30'
	| 'pattern-31'
	| 'pattern-32'
	| 'pattern-33';

/** Metadata for a single preset. */
export interface WhimsyPreset {
	/** Stable identifier — lines up with the file name. */
	readonly id: WhimsyPresetId;
	/** Short human label for the picker. */
	readonly label: string;
}

/**
 * The 33 Telegram-derived patterns, ordered by their original numbering. We
 * don't ship descriptive names because the source patterns aren't formally
 * named anywhere; "Pattern 7" is what they are.
 */
export const WHIMSY_PRESETS = [
	{ id: 'pattern-1', label: 'Pattern 1' },
	{ id: 'pattern-2', label: 'Pattern 2' },
	{ id: 'pattern-3', label: 'Pattern 3' },
	{ id: 'pattern-4', label: 'Pattern 4' },
	{ id: 'pattern-5', label: 'Pattern 5' },
	{ id: 'pattern-6', label: 'Pattern 6' },
	{ id: 'pattern-7', label: 'Pattern 7' },
	{ id: 'pattern-8', label: 'Pattern 8' },
	{ id: 'pattern-9', label: 'Pattern 9' },
	{ id: 'pattern-10', label: 'Pattern 10' },
	{ id: 'pattern-11', label: 'Pattern 11' },
	{ id: 'pattern-12', label: 'Pattern 12' },
	{ id: 'pattern-13', label: 'Pattern 13' },
	{ id: 'pattern-14', label: 'Pattern 14' },
	{ id: 'pattern-15', label: 'Pattern 15' },
	{ id: 'pattern-16', label: 'Pattern 16' },
	{ id: 'pattern-17', label: 'Pattern 17' },
	{ id: 'pattern-18', label: 'Pattern 18' },
	{ id: 'pattern-19', label: 'Pattern 19' },
	{ id: 'pattern-20', label: 'Pattern 20' },
	{ id: 'pattern-21', label: 'Pattern 21' },
	{ id: 'pattern-22', label: 'Pattern 22' },
	{ id: 'pattern-23', label: 'Pattern 23' },
	{ id: 'pattern-24', label: 'Pattern 24' },
	{ id: 'pattern-25', label: 'Pattern 25' },
	{ id: 'pattern-26', label: 'Pattern 26' },
	{ id: 'pattern-27', label: 'Pattern 27' },
	{ id: 'pattern-28', label: 'Pattern 28' },
	{ id: 'pattern-29', label: 'Pattern 29' },
	{ id: 'pattern-30', label: 'Pattern 30' },
	{ id: 'pattern-31', label: 'Pattern 31' },
	{ id: 'pattern-32', label: 'Pattern 32' },
	{ id: 'pattern-33', label: 'Pattern 33' },
] as const satisfies readonly WhimsyPreset[];

/**
 * URL the browser fetches for a given preset. Lives under `/public` so
 * Next.js serves it as a static asset; the browser caches it across reloads.
 */
export function whimsyPresetUrl(id: WhimsyPresetId): string {
	return `/whimsy-patterns/${id}.svg`;
}

/** Type guard for arbitrary input being a known preset id. */
export function isWhimsyPresetId(value: unknown): value is WhimsyPresetId {
	if (typeof value !== 'string') return false;
	return WHIMSY_PRESETS.some((preset) => preset.id === value);
}
