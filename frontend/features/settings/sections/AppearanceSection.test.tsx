import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppearanceSection } from './AppearanceSection';

describe('AppearanceSection', () => {
	it('renders the Theme + Light + Dark theme cards', () => {
		const { getByText } = render(<AppearanceSection />);
		expect(getByText('Theme')).toBeTruthy();
		expect(getByText('Light theme')).toBeTruthy();
		expect(getByText('Dark theme')).toBeTruthy();
	});

	it('renders all three theme mode toggles', () => {
		const { getByRole } = render(<AppearanceSection />);
		expect(getByRole('button', { name: /Light/ })).toBeTruthy();
		expect(getByRole('button', { name: /Dark/ })).toBeTruthy();
		expect(getByRole('button', { name: /System/ })).toBeTruthy();
	});

	it('toggles the active theme mode when a different button is pressed', () => {
		const { getByRole } = render(<AppearanceSection />);
		const dark = getByRole('button', { name: /Dark/ });
		fireEvent.click(dark);
		expect(dark.getAttribute('aria-pressed')).toBe('true');
	});

	it('renders the pointer cursors row + UI font size input', () => {
		const { getByText, getByDisplayValue } = render(<AppearanceSection />);
		expect(getByText('Use pointer cursors')).toBeTruthy();
		expect(getByText('UI font size')).toBeTruthy();
		expect(getByDisplayValue('14')).toBeTruthy();
	});
});
