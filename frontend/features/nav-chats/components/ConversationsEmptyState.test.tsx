import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConversationsEmptyState } from './ConversationsEmptyState';

describe('ConversationsEmptyState', () => {
	it('renders the title, description, and supplied icon', () => {
		const { getByText } = render(
			<ConversationsEmptyState
				icon={<span data-testid="icon">⚙️</span>}
				title="Nothing here yet"
				description="Start a chat to see it land in the sidebar."
			/>
		);
		expect(getByText('Nothing here yet')).toBeTruthy();
		expect(getByText(/Start a chat/)).toBeTruthy();
	});

	it('hides the CTA button when no buttonLabel is supplied', () => {
		const { queryByRole } = render(
			<ConversationsEmptyState icon={<span />} title="Empty" description="..." />
		);
		expect(queryByRole('button')).toBeNull();
	});

	it('renders the CTA button and fires onAction when both props are supplied', () => {
		const onAction = vi.fn();
		const { getByRole } = render(
			<ConversationsEmptyState
				icon={<span />}
				title="Empty"
				description="..."
				buttonLabel="Start a chat"
				onAction={onAction}
			/>
		);
		fireEvent.click(getByRole('button', { name: 'Start a chat' }));
		expect(onAction).toHaveBeenCalled();
	});
});
