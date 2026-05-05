import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GeneralSection } from './GeneralSection';

describe('GeneralSection', () => {
	it('renders the General page heading + every section heading', () => {
		const { getByRole } = render(<GeneralSection />);
		expect(getByRole('heading', { name: 'General' })).toBeTruthy();
		expect(getByRole('heading', { name: 'Profile' })).toBeTruthy();
		expect(getByRole('heading', { name: 'Preferences' })).toBeTruthy();
		expect(getByRole('heading', { name: 'Notifications' })).toBeTruthy();
	});

	it('renders the profile inputs with default values', () => {
		const { getByDisplayValue } = render(<GeneralSection />);
		expect(getByDisplayValue('Octavian Tocan')).toBeTruthy();
		expect(getByDisplayValue('Tavi')).toBeTruthy();
		expect(getByDisplayValue('Engineering')).toBeTruthy();
	});

	it('renders the appearance segmented control buttons', () => {
		const { getByText } = render(<GeneralSection />);
		expect(getByText('System')).toBeTruthy();
		expect(getByText('Light')).toBeTruthy();
		expect(getByText('Dark')).toBeTruthy();
	});
});
