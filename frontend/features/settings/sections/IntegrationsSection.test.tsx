import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntegrationsSection } from './IntegrationsSection';

describe('IntegrationsSection', () => {
	it('renders the Integrations page heading, the prototype notice, and the empty state', () => {
		const { getByRole, getByText } = render(<IntegrationsSection />);
		expect(getByRole('heading', { name: 'Integrations' })).toBeTruthy();
		expect(getByText('Your integrations')).toBeTruthy();
		expect(getByText('Coming soon')).toBeTruthy();
		expect(getByText('No integrations connected yet.')).toBeTruthy();
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
