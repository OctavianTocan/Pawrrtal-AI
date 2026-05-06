import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StepIdentity } from './step-identity';

describe('StepIdentity', () => {
	it('renders prefilled values from the profile prop', () => {
		const { getByDisplayValue } = render(
			<StepIdentity
				onContinue={vi.fn()}
				onPatch={vi.fn()}
				profile={{
					name: 'Tavi',
					companyWebsite: 'https://ai-nexus.dev',
					linkedin: '',
					role: 'Engineering',
					goals: [],
				}}
			/>
		);
		expect(getByDisplayValue('Tavi')).toBeTruthy();
		expect(getByDisplayValue('Engineering')).toBeTruthy();
		expect(getByDisplayValue('https://ai-nexus.dev')).toBeTruthy();
	});

	it('patches the profile when typing into the name field', () => {
		const onPatch = vi.fn();
		const { getByPlaceholderText } = render(
			<StepIdentity onContinue={vi.fn()} onPatch={onPatch} profile={{}} />
		);
		fireEvent.change(getByPlaceholderText('Your name'), { target: { value: 'Octavian' } });
		expect(onPatch).toHaveBeenCalledWith({ name: 'Octavian' });
	});

	it('toggles a goal chip on click and emits the new goals array', () => {
		const onPatch = vi.fn();
		const { getByText } = render(
			<StepIdentity onContinue={vi.fn()} onPatch={onPatch} profile={{ goals: [] }} />
		);
		fireEvent.click(getByText('SEO / AEO'));
		expect(onPatch).toHaveBeenCalledWith({ goals: ['SEO / AEO'] });
	});

	it('un-toggles a goal already in the goals array', () => {
		const onPatch = vi.fn();
		const { getByText } = render(
			<StepIdentity onContinue={vi.fn()} onPatch={onPatch} profile={{ goals: ['Writing'] }} />
		);
		fireEvent.click(getByText('Writing'));
		expect(onPatch).toHaveBeenCalledWith({ goals: [] });
	});

	it('fires onContinue when the footer button is clicked', () => {
		const onContinue = vi.fn();
		const { getByRole } = render(
			<StepIdentity onContinue={onContinue} onPatch={vi.fn()} profile={{}} />
		);
		fireEvent.click(getByRole('button', { name: /Continue/ }));
		expect(onContinue).toHaveBeenCalled();
	});
});
