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
		expect(getByText('Notifications')).toBeTruthy();
		// "Preferences" was previously a third card here. It was deleted
		// when the Appearance rail item became the single source of truth
		// for theme + chat font + voice; the duplicate was drifting out
		// of sync with the live settings.
	});

	it('renders the profile inputs with default values', () => {
		const { getByDisplayValue } = render(<GeneralSection />);
		expect(getByDisplayValue('Octavian Tocan')).toBeTruthy();
		expect(getByDisplayValue('Tavi')).toBeTruthy();
		expect(getByDisplayValue('Engineering')).toBeTruthy();
	});

	// The "appearance segmented control" assertion that previously lived
	// here was removed alongside the Preferences card — that affordance
	// now lives in `AppearanceSection`. The Appearance section's own
	// tests cover the System / Light / Dark toggle.
});
