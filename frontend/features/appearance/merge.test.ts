/**
 * Tests for the appearance merge layer.
 *
 * Locks down the invariant that user-supplied overrides win, but
 * `null` / `undefined` / missing keys never overwrite a default.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE } from './defaults';
import { resolveAppearance } from './merge';

describe('resolveAppearance', () => {
	it('returns the Mistral defaults when overrides are undefined', () => {
		expect(resolveAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
	});

	it('returns the Mistral defaults when every sub-record is empty', () => {
		const empty = { light: {}, dark: {}, fonts: {}, options: {} };
		expect(resolveAppearance(empty)).toEqual(DEFAULT_APPEARANCE);
	});

	it('overlays a single light-color override without touching the rest', () => {
		const resolved = resolveAppearance({
			light: { accent: '#FF0000' },
			dark: {},
			fonts: {},
			options: {},
		});
		expect(resolved.light.accent).toBe('#FF0000');
		// All other slots stay default.
		expect(resolved.light.background).toBe(DEFAULT_APPEARANCE.light.background);
		expect(resolved.light.foreground).toBe(DEFAULT_APPEARANCE.light.foreground);
		expect(resolved.dark).toEqual(DEFAULT_APPEARANCE.dark);
	});

	it('does not let a null override blast a default', () => {
		const resolved = resolveAppearance({
			light: { accent: null },
			dark: {},
			fonts: {},
			options: {},
		});
		expect(resolved.light.accent).toBe(DEFAULT_APPEARANCE.light.accent);
	});

	it('overlays a font override on the matching slot only', () => {
		const resolved = resolveAppearance({
			light: {},
			dark: {},
			fonts: { display: 'Playfair Display, serif' },
			options: {},
		});
		expect(resolved.fonts.display).toBe('Playfair Display, serif');
		expect(resolved.fonts.sans).toBe(DEFAULT_APPEARANCE.fonts.sans);
		expect(resolved.fonts.mono).toBe(DEFAULT_APPEARANCE.fonts.mono);
	});

	it('overlays an options override and merges with defaults', () => {
		const resolved = resolveAppearance({
			light: {},
			dark: {},
			fonts: {},
			options: { theme_mode: 'dark', ui_font_size: 18 },
		});
		expect(resolved.options.theme_mode).toBe('dark');
		expect(resolved.options.ui_font_size).toBe(18);
		// Untouched options keep their defaults.
		expect(resolved.options.contrast).toBe(DEFAULT_APPEARANCE.options.contrast);
		expect(resolved.options.pointer_cursors).toBe(DEFAULT_APPEARANCE.options.pointer_cursors);
	});

	it('keeps light and dark overrides isolated from each other', () => {
		const resolved = resolveAppearance({
			light: { accent: '#AAA111' },
			dark: { accent: '#BBB222' },
			fonts: {},
			options: {},
		});
		expect(resolved.light.accent).toBe('#AAA111');
		expect(resolved.dark.accent).toBe('#BBB222');
	});
});
