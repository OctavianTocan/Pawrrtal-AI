import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GeneralSection } from './GeneralSection';

describe('GeneralSection', () => {
	it('renders the General page heading + every section heading', () => {
		const { getByRole, getByText } = render(<GeneralSection />);
		// Page-level title is the only `<h1>` — section headers below
		// are intentionally rendered as `<span>` inside SettingsCard
		// so the document outline isn't littered with low-importance
		// h2/h3s, but they're still visible text.
		expect(getByRole('heading', { name: 'General' })).toBeTruthy();
		expect(getByText('Profile')).toBeTruthy();
		expect(getByText('Preferences')).toBeTruthy();
		expect(getByText('Notifications')).toBeTruthy();
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
