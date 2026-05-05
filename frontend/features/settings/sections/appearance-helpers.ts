/**
 * Pure helpers + label maps used by the Appearance settings section.
 *
 * Lives next to `AppearanceSection.tsx` rather than inside the component
 * file so the section itself stays under the 500-LOC project budget.
 * Anything that doesn't render JSX or hold component state belongs here.
 */

import { LaptopMinimal, Moon, Sun } from 'lucide-react';
import type {
	AppearanceFonts,
	AppearanceOptions,
	AppearanceSettings,
	ColorSlot,
	FontSlot,
	ThemeColors,
	ThemeMode,
} from '@/features/appearance';

/**
 * Debounce window (ms) for color hex / font family text inputs.
 *
 * Tuned to feel responsive (under the Doherty 400ms threshold) while
 * not flooding the API with one PUT per keystroke.
 */
export const TEXT_INPUT_DEBOUNCE_MS = 250;

/**
 * Resolve any CSS color string (hex, rgb, oklch, named) into a `#rrggbb`
 * literal that `<input type="color">` accepts.
 *
 * Uses an offscreen canvas because the native input doesn't speak
 * `oklch()`. Returns the input unchanged when it's already 7-char hex
 * (fast path). Falls back to a sensible default (`#888888`) on SSR or
 * when the runtime can't parse the string — the picker still shows
 * something draggable, and the typed input keeps its original value.
 *
 * @param value - Any CSS color string, or null/undefined.
 * @returns A normalized `#rrggbb` literal.
 */
export function toHex(value: string | undefined | null): string {
	if (!value) return '#888888';
	const trimmed = value.trim();
	if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
	if (typeof document === 'undefined') return '#888888';
	const ctx = document.createElement('canvas').getContext('2d');
	if (!ctx) return '#888888';
	try {
		ctx.fillStyle = '#000';
		ctx.fillStyle = trimmed;
		const computed = ctx.fillStyle;
		if (typeof computed === 'string' && /^#[0-9a-f]{6}$/i.test(computed)) {
			return computed.toLowerCase();
		}
	} catch {
		/* fall through to fallback */
	}
	return '#888888';
}

/** Human-readable labels for each color slot, shown next to the swatch. */
export const COLOR_LABELS: Record<ColorSlot, string> = {
	background: 'Background',
	foreground: 'Foreground',
	accent: 'Accent',
	info: 'Info',
	success: 'Success',
	destructive: 'Destructive',
};

/** Human-readable labels for each font slot. */
export const FONT_LABELS: Record<FontSlot, string> = {
	display: 'Display font',
	sans: 'UI font',
	mono: 'Code font',
};

/**
 * Theme mode options shown in the top-of-card switcher.
 *
 * Frozen as a tuple so the component picker preserves icon + id literal
 * types without redeclaring the union elsewhere.
 */
export const THEME_MODE_OPTIONS = [
	{ id: 'light', label: 'Light', Icon: Sun },
	{ id: 'dark', label: 'Dark', Icon: Moon },
	{ id: 'system', label: 'System', Icon: LaptopMinimal },
] as const satisfies ReadonlyArray<{ id: ThemeMode; label: string; Icon: typeof Sun }>;

/**
 * Compose a full `AppearanceSettings` payload from the four sub-records.
 *
 * Centralized so every mutation path uses the exact same shape — the
 * server's PUT endpoint validates against this and rejects anything
 * with a missing top-level key.
 *
 * @param light - Light-mode color overrides (sparse).
 * @param dark - Dark-mode color overrides (sparse).
 * @param fonts - Font-family overrides (sparse).
 * @param options - Behavior + numeric options (full record, never sparse).
 * @returns The composed payload, ready for PUT.
 */
export function buildPayload(
	light: ThemeColors,
	dark: ThemeColors,
	fonts: AppearanceFonts,
	options: AppearanceOptions
): AppearanceSettings {
	return { light, dark, fonts, options };
}
