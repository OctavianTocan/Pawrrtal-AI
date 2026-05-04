import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { SettingsLayout } from './SettingsLayout';

describe('SettingsLayout', () => {
	it('renders the rail with Back to app + every section button', () => {
		const { getByRole } = render(<SettingsLayout />);
		expect(getByRole('button', { name: /Back to app/ })).toBeTruthy();
		expect(getByRole('button', { name: 'General' })).toBeTruthy();
		expect(getByRole('button', { name: 'Appearance' })).toBeTruthy();
		expect(getByRole('button', { name: 'Personalization' })).toBeTruthy();
		expect(getByRole('button', { name: 'Integrations' })).toBeTruthy();
		expect(getByRole('button', { name: 'Usage' })).toBeTruthy();
	});

	it('defaults to the General section', () => {
		const { getByRole } = render(<SettingsLayout />);
		expect(getByRole('heading', { name: 'Settings' })).toBeTruthy();
	});

	it('switches the right pane to Appearance when the rail item is clicked', () => {
		const { getByRole, getByText } = render(<SettingsLayout />);
		fireEvent.click(getByRole('button', { name: 'Appearance' }));
		expect(getByText('Theme')).toBeTruthy();
	});

	it('switches the right pane to Usage when the rail item is clicked', () => {
		const { getByRole } = render(<SettingsLayout />);
		fireEvent.click(getByRole('button', { name: 'Usage' }));
		expect(getByRole('heading', { name: 'Usage' })).toBeTruthy();
	});
});
