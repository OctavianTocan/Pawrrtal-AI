/**
 * Public surface of the appearance feature module.
 *
 * Consumer code should import from this index, never from sibling
 * files directly — keeps refactors local and signals what the feature
 * exports vs. what is internal helper code.
 */

export { AppearanceProvider, pickActiveMode, useResolvedAppearance } from './AppearanceProvider';
export {
	DEFAULT_APPEARANCE,
	DEFAULT_DARK_COLORS,
	DEFAULT_FONTS,
	DEFAULT_LIGHT_COLORS,
	DEFAULT_OPTIONS,
} from './defaults';
export { resolveAppearance } from './merge';
export type { ThemePreset } from './presets.generated';
export { THEME_PRESETS } from './presets.generated';
export {
	APPEARANCE_QUERY_KEY,
	useAppearance,
	useResetAppearance,
	useUpdateAppearance,
} from './queries';
export type {
	AppearanceFonts,
	AppearanceOptions,
	AppearanceSettings,
	ColorSlot,
	FontSlot,
	ResolvedAppearance,
	ThemeColors,
	ThemeMode,
} from './types';
export {
	COLOR_SLOTS,
	FONT_SLOTS,
	THEME_MODES,
} from './types';
