// AUTO-GENERATED — do not edit by hand.
// Run `bun run themes:build` to regenerate from `themes/*.md`.
//
// Source files: cursor.md, mistral.md

import type { ColorSlot, FontSlot } from './types';

/**
 * A theme preset converted from a `themes/*.md` DESIGN.md file.
 *
 * The Appearance panel exposes these via the "Apply preset" picker.
 * Selecting a preset writes its color + font slots into the user's
 * persisted appearance settings — the panel still shows live editable
 * values so the user can fine-tune from there.
 */
export interface ThemePreset {
	/** Stable id derived from the theme file basename. */
	id: string;
	/** Human-readable label shown in the picker. */
	name: string;
	/** Tooltip / sub-label shown under the name. */
	description: string;
	/** Sparse color overrides keyed by slot. Missing keys → use defaults. */
	colors: Partial<Record<ColorSlot, string>>;
	/** Sparse font overrides keyed by slot. Missing keys → use defaults. */
	fonts: Partial<Record<FontSlot, string>>;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
	{
		id: 'cursor',
		name: 'Cursor',
		description:
			'An AI-first code editor whose marketing site reads like a quietly-confident developer-tools brand with a warm-cream editorial canvas (`#f7f7f4`) instead of the typical dark IDE atmosphere. Near-black warm ink (`#26251e`) carries body and display alike — display sits at weight 400 with negative letter-spacing for a magazine feel rather than a bold tech voice. The single brand voltage is **Cursor Orange** (`#f54e00`) reserved for primary CTAs and the wordmark. A signature pastel timeline palette (peach, mint, blue, lavender, gold) marks AI-action stages (Thinking / Reading / Editing / Grepping / Done) — only inside in-product timeline visualizations. Cards use minimal hairlines, no shadows, generous 80px section rhythm. CursorGothic for display/body, JetBrains Mono on every code surface (which is roughly half the page).',
		colors: {
			accent: '#f54e00',
		},
		fonts: {
			display: '"\'CursorGothic\', sans-serif", Georgia, "Times New Roman", serif',
			sans: '"\'CursorGothic\', sans-serif", system-ui, sans-serif',
			mono: '"\'JetBrains Mono\', \'Fira Code\', monospace", ui-monospace, "JetBrains Mono", monospace',
		},
	},
	{
		id: 'mistral',
		name: 'Mistral AI',
		description:
			'Mistral AI brands itself with a singular signature — atmospheric sunset gradients (mustard, orange, deep red) layered over photography of mountains, plus a horizontal "sunset stripe" bar that closes every page. The system pairs warm cream-yellow surfaces ({colors.cream}) with a saturated orange primary CTA ({colors.primary}) and uses an elegant near-serif voice for hero displays. Coverage spans homepage (Frontier AI hero), Le Studio product page, Coding solutions, news article surfaces, contact form, and services tier page — all anchored by the signature gradient closing band.',
		colors: {
			accent: '#fa520f',
		},
		fonts: {
			display: '"PP Editorial Old", Georgia, "Times New Roman", serif',
			sans: '"Inter", system-ui, sans-serif',
			mono: '"JetBrains Mono", ui-monospace, "JetBrains Mono", monospace',
		},
	},
] as const;
