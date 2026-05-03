/**
 * Glassmorphism styling helpers: convert optional customization into inline `style` props and CSS custom properties.
 *
 * @fileoverview Shared by surfaces that use frosted-glass backgrounds; pairs with theme variables like `--glass-bg`.
 */

import type * as React from 'react';

export interface GlassCustomization {
	/**
	 * Background color for the glass effect (e.g., "rgba(255, 255, 255, 0.1)" or "#ffffff")
	 * Default: uses CSS variable --glass-bg
	 */
	color?: string;

	/**
	 * Transparency/opacity for the background (0-1)
	 * If provided, will override the alpha channel in color
	 */
	transparency?: number;

	/**
	 * Blur amount in pixels
	 * Default: uses CSS variable --blur (20px)
	 */
	blur?: number | string;

	/**
	 * Border/outline color (e.g., "rgba(255, 255, 255, 0.25)" or "#ffffff")
	 * Default: uses CSS variable --glass-border
	 */
	outline?: string;

	/**
	 * Border/outline width in pixels
	 * Default: 1px
	 */
	outlineWidth?: number | string;

	/**
	 * Shadow for the glass effect
	 * Default: uses CSS variable --glass-shadow
	 */
	shadow?: string;

	/**
	 * Inner glow color and intensity (e.g., "rgba(255, 255, 255, 0.2)")
	 * Creates an inset shadow for a glowing effect inside the element
	 */
	innerGlow?: string;

	/**
	 * Inner glow blur/spread radius in pixels
	 * Default: 20px
	 */
	innerGlowBlur?: number | string;
}

const DEFAULT_GLASS_COLOR = 'rgba(255, 255, 255, 0.1)';
const DEFAULT_GLASS_BORDER = 'rgba(255, 255, 255, 0.3)';
const DEFAULT_GLASS_SHADOW = '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)';
const DEFAULT_INNER_GLOW_BLUR = '20px';

const toPixelValue = (value: number | string): string =>
	typeof value === 'number' ? `${value}px` : value;

const hasBaseGlassCustomization = (customization: GlassCustomization): boolean =>
	Boolean(
		customization.color ||
			customization.transparency !== undefined ||
			customization.blur !== undefined
	);

const applyTransparency = (color: string, transparency?: number): string => {
	if (transparency === undefined) {
		return color;
	}

	const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
	if (rgbaMatch) {
		const [, r, g, b] = rgbaMatch;
		return `rgba(${r}, ${g}, ${b}, ${transparency})`;
	}

	if (color.startsWith('#')) {
		const hex = color.replace('#', '');
		const r = Number.parseInt(hex.substring(0, 2), 16);
		const g = Number.parseInt(hex.substring(2, 4), 16);
		const b = Number.parseInt(hex.substring(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${transparency})`;
	}

	return `${color}${transparency}`;
};

const getBackgroundColor = (customization: GlassCustomization): string =>
	applyTransparency(customization.color ?? DEFAULT_GLASS_COLOR, customization.transparency);

const addBorderStyles = (styles: React.CSSProperties, customization: GlassCustomization): void => {
	if (customization.outline !== undefined) {
		styles.borderColor = customization.outline;
		styles.borderWidth = toPixelValue(customization.outlineWidth ?? '1px');
		styles.borderStyle = 'solid';
		return;
	}

	if (hasBaseGlassCustomization(customization)) {
		styles.borderColor = DEFAULT_GLASS_BORDER;
		styles.borderWidth = '1px';
		styles.borderStyle = 'solid';
	}
};

const buildBoxShadow = (customization: GlassCustomization): string | undefined => {
	const shadows: string[] = [];

	if (customization.shadow !== undefined) {
		shadows.push(customization.shadow);
	} else if (hasBaseGlassCustomization(customization)) {
		shadows.push(DEFAULT_GLASS_SHADOW);
	}

	if (customization.innerGlow !== undefined) {
		const glowBlur =
			customization.innerGlowBlur !== undefined
				? toPixelValue(customization.innerGlowBlur)
				: DEFAULT_INNER_GLOW_BLUR;
		shadows.push(`inset 0 0 ${glowBlur} ${customization.innerGlow}`);
	}

	return shadows.length > 0 ? shadows.join(', ') : undefined;
};

/**
 * Converts glass customization props to CSS style object
 */
export function getGlassStyles(customization?: GlassCustomization): React.CSSProperties {
	if (!customization) return {};

	const styles: React.CSSProperties = {};

	if (customization.color || customization.transparency !== undefined) {
		styles.backgroundColor = getBackgroundColor(customization);
	}

	if (customization.blur !== undefined) {
		const blurValue = toPixelValue(customization.blur);
		styles.backdropFilter = `blur(${blurValue})`;
		styles.WebkitBackdropFilter = `blur(${blurValue})`; // Safari support
	}

	addBorderStyles(styles, customization);

	const boxShadow = buildBoxShadow(customization);
	if (boxShadow) {
		styles.boxShadow = boxShadow;
	}

	return styles;
}

/**
 * Generates CSS custom properties for glass customization
 * Useful for components that need to pass styles to child elements
 */
export function getGlassCSSVars(customization?: GlassCustomization): Record<string, string> {
	if (!customization) return {};

	const vars: Record<string, string> = {};

	if (customization.color || customization.transparency !== undefined) {
		vars['--glass-bg-custom'] = getBackgroundColor(customization);
	}

	if (customization.blur !== undefined) {
		vars['--blur-custom'] = toPixelValue(customization.blur);
	}

	if (customization.outline !== undefined) {
		vars['--glass-border-custom'] = customization.outline;
	}

	if (customization.outlineWidth !== undefined) {
		vars['--glass-border-width-custom'] = toPixelValue(customization.outlineWidth);
	}

	if (customization.shadow !== undefined) {
		vars['--glass-shadow-custom'] = customization.shadow;
	}

	if (customization.innerGlow !== undefined) {
		vars['--glass-inner-glow-custom'] = customization.innerGlow;
	}

	if (customization.innerGlowBlur !== undefined) {
		vars['--glass-inner-glow-blur-custom'] = toPixelValue(customization.innerGlowBlur);
	}

	return vars;
}
