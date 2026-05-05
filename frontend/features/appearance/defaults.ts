/**
 * Default appearance values — Mistral-inspired sunlit-cream tokens.
 *
 * These are the *frontend* source of truth for the unmodified theme.
 * They mirror the canonical CSS custom-property values in
 * `frontend/app/globals.css`. The merge logic in `merge.ts` overlays
 * persisted user overrides (from `/api/v1/appearance`) on top of these
 * defaults so the theme system always has a fully-resolved value to
 * write into the `--<role>` CSS variables.
 *
 * If you change a token here, change it in `globals.css` in the same
 * commit (and mirror in `DESIGN.md` front matter). The lint
 * (`bun run design:lint`) gates the design system; this constant gates
 * the appearance overlay.
 */

import type { ColorSlot, FontSlot, ResolvedAppearance } from './types';

/**
 * Light-mode color anchors. Mirrors the Mistral palette — saturated
 * orange accent, warm cream surface, deep ink. Match the active CSS
 * tokens in `globals.css` exactly so the merge-overlay layer doesn't
 * need to translate values before writing them onto `<html>`.
 */
export const DEFAULT_LIGHT_COLORS: Record<ColorSlot, string> = {
	/** Warm cream surface — Mistral `#fff8e0` territory, sunlit. */
	background: 'oklch(0.985 0.026 92)',
	/** Deep ink (~#1f1f1f) for primary text + icons. */
	foreground: 'oklch(0.21 0.005 285)',
	/** Mistral orange — saturated CTA + active states (~#fa520f). */
	accent: 'oklch(0.66 0.21 38)',
	/** Sunshine amber — "Ask" / warnings (~#ff8105). */
	info: 'oklch(0.74 0.18 55)',
	/** Connected/success green. */
	success: 'oklch(0.55 0.17 145)',
	/** Mistral deep red (~#cc3a05) — errors, dangerous actions. */
	destructive: 'oklch(0.55 0.22 32)',
};

/**
 * Dark-mode color anchors. Codex/GitHub-adjacent — explicitly NOT the
 * inverse of light. Touch only when you have a reason that survives
 * a code review against `DESIGN.md` § Dark Mode Anchors.
 */
export const DEFAULT_DARK_COLORS: Record<ColorSlot, string> = {
	/** Page/workspace canvas (~#0D1117). */
	background: 'oklch(0.205 0.012 264)',
	/** Primary text (~#E6EDF3). */
	foreground: 'oklch(0.939 0.012 252)',
	/** Interactive blue (~#388BFD). */
	accent: 'oklch(0.628 0.154 264)',
	/** Slightly brighter sunset amber for legibility on dark. */
	info: 'oklch(0.7 0.16 70)',
	/** Slightly brighter green on dark surfaces. */
	success: 'oklch(0.6 0.17 145)',
	/** Slightly brighter red on dark surfaces. */
	destructive: 'oklch(0.7 0.19 22)',
};

/**
 * Default font stacks. The display family relies on `--font-display-loaded`
 * being injected by `next/font` in `app/layout.tsx`; the fallback chain
 * keeps editorial character even before the variable font arrives.
 */
export const DEFAULT_FONTS: Record<FontSlot, string> = {
	display:
		'var(--font-display-loaded, "Newsreader"), "Iowan Old Style", "Charter", Georgia, "Times New Roman", serif',
	sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
};

/** Default behavioral toggles. */
export const DEFAULT_OPTIONS: ResolvedAppearance['options'] = {
	theme_mode: 'system',
	translucent_sidebar: false,
	contrast: 60,
	pointer_cursors: true,
	ui_font_size: 16,
};

/**
 * Fully-resolved Mistral defaults — what you get when no user has
 * customized anything. Useful for tests and as the initial value for
 * the React context before the API query resolves.
 */
export const DEFAULT_APPEARANCE: ResolvedAppearance = {
	light: DEFAULT_LIGHT_COLORS,
	dark: DEFAULT_DARK_COLORS,
	fonts: DEFAULT_FONTS,
	options: DEFAULT_OPTIONS,
};
