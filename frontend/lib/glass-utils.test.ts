import { describe, expect, it } from 'vitest';
import { getGlassCSSVars, getGlassStyles } from './glass-utils';

describe('glass-utils', () => {
	it('applies transparency to rgba and hex background colors', () => {
		expect(
			getGlassStyles({
				color: 'rgba(10, 20, 30, 0.8)',
				transparency: 0.25,
			})
		).toMatchObject({
			backgroundColor: 'rgba(10, 20, 30, 0.25)',
		});

		expect(
			getGlassCSSVars({
				color: '#0a141e',
				transparency: 0.5,
			})
		).toMatchObject({
			'--glass-bg-custom': 'rgba(10, 20, 30, 0.5)',
		});
	});

	it('adds default border and shadow when base glass customization is present', () => {
		expect(getGlassStyles({ blur: 24 })).toMatchObject({
			backdropFilter: 'blur(24px)',
			WebkitBackdropFilter: 'blur(24px)',
			borderColor: 'rgba(255, 255, 255, 0.3)',
			borderWidth: '1px',
			borderStyle: 'solid',
			boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
		});
	});

	it('combines custom shadow with inner glow blur', () => {
		expect(
			getGlassStyles({
				shadow: '0 1px 2px black',
				innerGlow: 'rgba(255, 255, 255, 0.2)',
				innerGlowBlur: 12,
			})
		).toMatchObject({
			boxShadow: '0 1px 2px black, inset 0 0 12px rgba(255, 255, 255, 0.2)',
		});
	});
});
