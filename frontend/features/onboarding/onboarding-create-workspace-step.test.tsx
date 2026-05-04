import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/components/ui/dialog';
import { OnboardingCreateWorkspaceStep } from './onboarding-create-workspace-step';

const wrap = (node: React.ReactElement): React.ReactElement => (
	<Dialog open onOpenChange={() => undefined}>
		{node}
	</Dialog>
);

describe('OnboardingCreateWorkspaceStep', () => {
	it('renders the workspace selection options', () => {
		const { container } = render(
			wrap(<OnboardingCreateWorkspaceStep onPickLocal={() => undefined} />)
		);
		expect(container.textContent).toContain('Open folder');
		expect(container.textContent).toContain('Create new');
		expect(container.textContent).toContain('Connect to remote server');
	});

	it('disables the upcoming options', () => {
		const { container } = render(
			wrap(<OnboardingCreateWorkspaceStep onPickLocal={() => undefined} />)
		);
		const buttons = Array.from(container.querySelectorAll('button'));
		const enabled = buttons.filter((b) => !(b as HTMLButtonElement).disabled);
		expect(enabled.length).toBe(1);
	});

	it('fires onPickLocal when the enabled "Open folder" button is clicked', () => {
		const onPickLocal = vi.fn();
		const { getByText } = render(
			wrap(<OnboardingCreateWorkspaceStep onPickLocal={onPickLocal} />)
		);
		fireEvent.click(getByText('Open folder'));
		expect(onPickLocal).toHaveBeenCalled();
	});
});
