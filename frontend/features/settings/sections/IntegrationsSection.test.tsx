import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntegrationsSection } from './IntegrationsSection';

describe('IntegrationsSection', () => {
	it('renders the Integrations page heading + every Your Integrations row', () => {
		const { getByRole, getAllByText, getByText } = render(<IntegrationsSection />);
		// Page-level h1 set by SettingsPage
		expect(getByRole('heading', { name: 'Integrations' })).toBeTruthy();
		// Section header inside the card (rendered as a span, not heading)
		expect(getByText('Your integrations')).toBeTruthy();
		// Apple Calendar appears in YOUR_INTEGRATIONS
		expect(getAllByText('Apple Calendar').length).toBeGreaterThan(0);
	});

	it('opens the Add Integration modal when the trigger button is clicked', () => {
		const { getByRole, queryByText, getByPlaceholderText } = render(<IntegrationsSection />);
		expect(queryByText('Add integrations')).toBeNull();
		fireEvent.click(getByRole('button', { name: /Add integration/ }));
		expect(getByPlaceholderText('Search integrations...')).toBeTruthy();
	});

	it('opens the Add MCP Server modal from the catalog Add custom button', () => {
		const { getByRole, getByPlaceholderText } = render(<IntegrationsSection />);
		fireEvent.click(getByRole('button', { name: /Add integration/ }));
		fireEvent.click(getByRole('button', { name: /Add custom/ }));
		expect(getByPlaceholderText('https://mcp.example.com/mcp')).toBeTruthy();
	});
});
