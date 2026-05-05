import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntegrationsSection } from './IntegrationsSection';

describe('IntegrationsSection', () => {
	it('renders Your Integrations heading + every Your Integrations row', () => {
		const { getByRole, getAllByText } = render(<IntegrationsSection />);
		expect(getByRole('heading', { name: 'Your Integrations' })).toBeTruthy();
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
