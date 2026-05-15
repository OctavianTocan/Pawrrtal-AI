import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PERSONALITY_OPTIONS } from '@/lib/personalization/storage';
import { StepPersonality } from './step-personality';

describe('StepPersonality', () => {
	it('renders every personality option as a card', () => {
		const { getByText } = render(
			<StepPersonality onContinue={vi.fn()} onPatch={vi.fn()} profile={{}} />
		);
		for (const option of PERSONALITY_OPTIONS) {
			expect(getByText(option.label)).toBeTruthy();
		}
	});

	it('marks the first option as selected when the profile has no personality yet', () => {
		const { getByText } = render(
			<StepPersonality onContinue={vi.fn()} onPatch={vi.fn()} profile={{}} />
		);
		const card = getByText(PERSONALITY_OPTIONS[0].label).closest('button');
		expect(card?.getAttribute('aria-pressed')).toBe('true');
	});

	it('patches profile.personality when a different option is clicked', () => {
		const onPatch = vi.fn();
		const { getByText } = render(
			<StepPersonality onContinue={vi.fn()} onPatch={onPatch} profile={{}} />
		);
		fireEvent.click(getByText('Honest Coach'));
		expect(onPatch).toHaveBeenCalledWith({ personality: 'honest-coach' });
	});

	it('fires onContinue when the footer Continue button is clicked', () => {
		const onContinue = vi.fn();
		const { getByRole } = render(
			<StepPersonality onContinue={onContinue} onPatch={vi.fn()} profile={{}} />
		);
		fireEvent.click(getByRole('button', { name: 'Save personality' }));
		expect(onContinue).toHaveBeenCalled();
	});
});
