import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StepContext } from './step-context';

describe('StepContext', () => {
	it('renders the heading + Open ChatGPT link + textarea', () => {
		const { getByRole, getByPlaceholderText } = render(
			<StepContext onContinue={vi.fn()} onPatch={vi.fn()} onSkip={vi.fn()} profile={{}} />
		);
		expect(getByRole('heading', { name: /Let's give your agent some context/ })).toBeTruthy();
		expect(getByRole('link', { name: /Open ChatGPT/ })).toBeTruthy();
		expect(getByPlaceholderText("Paste ChatGPT's response here...")).toBeTruthy();
	});

	it('patches profile.chatgptContext when typing into the textarea', () => {
		const onPatch = vi.fn();
		const { getByPlaceholderText } = render(
			<StepContext onContinue={vi.fn()} onPatch={onPatch} onSkip={vi.fn()} profile={{}} />
		);
		fireEvent.change(getByPlaceholderText("Paste ChatGPT's response here..."), {
			target: { value: 'pasted blob' },
		});
		expect(onPatch).toHaveBeenCalledWith({ chatgptContext: 'pasted blob' });
	});

	it('fires onContinue + onSkip from their respective controls', () => {
		const onContinue = vi.fn();
		const onSkip = vi.fn();
		const { getByText } = render(
			<StepContext onContinue={onContinue} onPatch={vi.fn()} onSkip={onSkip} profile={{}} />
		);
		fireEvent.click(getByText('Continue'));
		fireEvent.click(getByText('Skip for now'));
		expect(onContinue).toHaveBeenCalled();
		expect(onSkip).toHaveBeenCalled();
	});
});
