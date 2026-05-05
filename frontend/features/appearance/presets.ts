/**
 * Hand-curated theme presets.
 *
 * Each preset declares the full payload (light + dark color slots +
 * font families) the appearance pipeline writes onto `<html>` when the
 * user picks it from the Theme dropdown. A preset selection is
 * authoritative — it replaces ALL slots for both modes, not just the
 * ones that differ from the previous preset, so switching between
 * presets always looks like a clean visual swap rather than a partial
 * merge.
 *
 * To add a new preset: append an entry below. No build step, no YAML
 * parsing — TypeScript imports it directly.
 */

import type { ColorSlot, FontSlot } from './types';

/**
 * Fully-populated palette for one theme mode. Differs from
 * `ThemeColors` because every slot is non-null — presets MUST declare
 * all six slots so the picker never falls back mid-swap.
 */
export type PresetPalette = Record<ColorSlot, string>;
/** Same as `PresetPalette` but for the three font slots. */
export type PresetFonts = Record<FontSlot, string>;

/** Single curated theme — name + light/dark palettes + font stack. */
export interface ThemePreset {
	/** Stable id used as the dropdown value + persisted preset key. */
	id: string;
	/** Human-readable label shown in the picker. */
	name: string;
	/** One-line tooltip / sub-label. */
	description: string;
	/** Light-mode color values for every slot (no nulls). */
	light: PresetPalette;
	/** Dark-mode color values for every slot (no nulls). */
	dark: PresetPalette;
	/** Font family stacks for every slot (no nulls). */
	fonts: PresetFonts;
}

/**
 * Stack helper — one place to keep the system-fallback chain so each
 * preset's font line stays readable.
 */
const SYSTEM_SANS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SYSTEM_MONO =
	'"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

/**
 * Mistral preset — pure white product canvas (NOT the marketing-page
 * cream tint), saturated Mistral orange CTAs, deep ink, near-serif
 * editorial display (Newsreader as the free PP Editorial Old
 * stand-in). Dark mode is a deep warm-charcoal flipped from white,
 * keeping the orange anchor for continuity.
 *
 * The chat.mistral.ai product UI is white-canvas + orange CTA; the
 * mistral.ai marketing site uses cream as a section tint. Presets
 * model the product, not the marketing site.
 */
const MISTRAL_PRESET: ThemePreset = {
	id: 'mistral',
	name: 'Mistral AI',
	description: 'White canvas, saturated orange CTAs, editorial display serif.',
	light: {
		background: '#ffffff',
		foreground: '#1f1f1f',
		accent: '#fa520f',
		info: '#ff8105',
		success: '#22783c',
		destructive: '#cc3a05',
	},
	dark: {
		background: '#1c1612',
		foreground: '#f5ecd9',
		accent: '#ff7a3c',
		info: '#ffa110',
		success: '#3fa760',
		destructive: '#e5552b',
	},
	fonts: {
		display:
			'var(--font-display-loaded, "Newsreader"), "Iowan Old Style", Charter, Georgia, "Times New Roman", serif',
		sans: SYSTEM_SANS,
		mono: SYSTEM_MONO,
	},
};

/**
 * Cursor preset — distinctly cooler / greyer canvas than Mistral's
 * warm yellow cream, paired with Cursor's signature electric blue
 * CTA (the IDE accent, not the marketing-orange). Geist sans for
 * everything. Dark mode mirrors Cursor's IDE — true dark background
 * with the same blue anchor.
 *
 * The `background` is shifted toward neutral grey-white (vs Mistral's
 * warm yellow cream) and the accent is shifted to blue (vs Mistral's
 * orange) so the two presets read as immediately different at a
 * glance — even when applied to the same screen.
 */
const CURSOR_PRESET: ThemePreset = {
	id: 'cursor',
	name: 'Cursor',
	description: 'Cool slate canvas with electric blue CTAs and Geist sans typography.',
	light: {
		background: '#fafbfc',
		foreground: '#0d1117',
		accent: '#1f6feb',
		info: '#0969da',
		success: '#1a7f37',
		destructive: '#cf222e',
	},
	dark: {
		background: '#0d1117',
		foreground: '#e6edf3',
		accent: '#388bfd',
		info: '#58a6ff',
		success: '#3fb950',
		destructive: '#f85149',
	},
	fonts: {
		// Geist ships as a free Google Font; the fallback chain ends in
		// system-ui so something legible always renders.
		display: '"Geist", "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
		sans: '"Geist", "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
		mono: '"Geist Mono", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
	},
};

/**
 * AI Nexus default preset — the system fallback when no preset is
 * picked. Mirrors `defaults.ts` exactly so applying it explicitly is
 * a clean reset to the unmodified palette.
 */
const AI_NEXUS_PRESET: ThemePreset = {
	id: 'ai-nexus',
	name: 'AI Nexus',
	description: 'Project default — Mistral-inspired tokens with Newsreader display serif.',
	light: {
		background: 'oklch(0.985 0.026 92)',
		foreground: 'oklch(0.21 0.005 285)',
		accent: 'oklch(0.66 0.21 38)',
		info: 'oklch(0.74 0.18 55)',
		success: 'oklch(0.55 0.17 145)',
		destructive: 'oklch(0.55 0.22 32)',
	},
	dark: {
		background: 'oklch(0.205 0.012 264)',
		foreground: 'oklch(0.939 0.012 252)',
		accent: 'oklch(0.628 0.154 264)',
		info: 'oklch(0.7 0.16 70)',
		success: 'oklch(0.6 0.17 145)',
		destructive: 'oklch(0.7 0.19 22)',
	},
	fonts: {
		display:
			'var(--font-display-loaded, "Newsreader"), "Iowan Old Style", Charter, Georgia, "Times New Roman", serif',
		sans: SYSTEM_SANS,
		mono: SYSTEM_MONO,
	},
};

/** Ordered list of presets shown in the picker. */
export const THEME_PRESETS: readonly ThemePreset[] = [
	AI_NEXUS_PRESET,
	MISTRAL_PRESET,
	CURSOR_PRESET,
] as const;

/** Look up a preset by id, returning `undefined` for unknown ids. */
export function findPreset(id: string): ThemePreset | undefined {
	return THEME_PRESETS.find((preset) => preset.id === id);
}
