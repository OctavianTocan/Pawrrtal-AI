/**
 * Type definitions for the per-user Appearance settings.
 *
 * Mirrors the backend Pydantic schemas in
 * `backend/app/schemas.py` (`AppearanceSettings`, `ThemeColors`,
 * `AppearanceFonts`, `AppearanceOptions`). Every field is nullable so
 * partial customizations round-trip through the GET / PUT cycle without
 * coercing missing fields into placeholder strings — the merge layer in
 * `defaults.ts` overlays user values on top of the Mistral-inspired
 * defaults at runtime.
 */

/** Tuple of the six semantic color slots the system exposes. */
export const COLOR_SLOTS = [
	'background',
	'foreground',
	'accent',
	'info',
	'success',
	'destructive',
] as const;

/** Single color slot key (`'background' | 'foreground' | …`). */
export type ColorSlot = (typeof COLOR_SLOTS)[number];

/**
 * Per-mode color overrides. Each value is a CSS color string (hex,
 * `oklch(...)`, named color) that lands directly on the
 * `--<role>` CSS custom property at runtime when present.
 */
export type ThemeColors = {
	[K in ColorSlot]?: string | null;
};

/** Tuple of the three font family slots. */
export const FONT_SLOTS = ['display', 'sans', 'mono'] as const;

/** Single font slot key (`'display' | 'sans' | 'mono'`). */
export type FontSlot = (typeof FONT_SLOTS)[number];

/** Font family overrides applied to the type system. */
export type AppearanceFonts = {
	[K in FontSlot]?: string | null;
};

/** Tuple of the supported theme modes. */
export const THEME_MODES = ['light', 'dark', 'system'] as const;

/** Theme mode the user can pick in the Appearance panel. */
export type ThemeMode = (typeof THEME_MODES)[number];

/** Mode + behavioral toggles for the appearance system. */
export interface AppearanceOptions {
	/** Which palette is active. `'system'` follows the OS preference. */
	theme_mode?: ThemeMode | null;
	/** Whether the sidebar uses scenic / glass treatment when available. */
	translucent_sidebar?: boolean | null;
	/** Contrast slider value (0-100). Currently advisory; reserved for future
	 *  contrast scaling on the foreground-N mix scale. */
	contrast?: number | null;
	/** Whether interactive elements get `cursor-pointer` (the project default
	 *  is `true`; this lets users opt out of the affordance). */
	pointer_cursors?: boolean | null;
	/** Base UI font size in px. Drives the `--font-size-base` custom property
	 *  so every `rem`-denominated value scales with it. */
	ui_font_size?: number | null;
}

/**
 * Top-level appearance payload — used as both the API response and the
 * mutation request body.
 */
export interface AppearanceSettings {
	light: ThemeColors;
	dark: ThemeColors;
	fonts: AppearanceFonts;
	options: AppearanceOptions;
}

/**
 * Resolved appearance — the merge of `AppearanceSettings` with the
 * defaults from `defaults.ts`. Every field is non-null at this point so
 * the provider can write straight to CSS variables without re-checking.
 */
export interface ResolvedAppearance {
	light: Required<{ [K in ColorSlot]: string }>;
	dark: Required<{ [K in ColorSlot]: string }>;
	fonts: Required<{ [K in FontSlot]: string }>;
	options: {
		theme_mode: ThemeMode;
		translucent_sidebar: boolean;
		contrast: number;
		pointer_cursors: boolean;
		ui_font_size: number;
	};
}
