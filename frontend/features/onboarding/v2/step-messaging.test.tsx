import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StepMessaging } from './step-messaging';

vi.mock('@/lib/channels', () => ({
	listChannels: vi.fn().mockResolvedValue([]),
}));

describe('StepMessaging', () => {
	it('renders every channel as a Connect row', () => {
		const { getByText } = render(
			<StepMessaging
				onFinish={vi.fn()}
				onPatch={vi.fn()}
				profile={{ connectedChannels: [] }}
			/>
		);
		expect(getByText('Connect Slack')).toBeTruthy();
		expect(getByText('Connect Telegram')).toBeTruthy();
		expect(getByText('Connect WhatsApp')).toBeTruthy();
		expect(getByText('Connect iMessage')).toBeTruthy();
	});

	it('disables Continue until at least one channel is connected', () => {
		const { getByRole, rerender } = render(
			<StepMessaging
				onFinish={vi.fn()}
				onPatch={vi.fn()}
				profile={{ connectedChannels: [] }}
			/>
		);
		const continueButton = getByRole('button', {
			name: 'Finish messaging setup',
		}) as HTMLButtonElement;
		expect(continueButton.disabled).toBe(true);

		rerender(
			<StepMessaging
				onFinish={vi.fn()}
				onPatch={vi.fn()}
				profile={{ connectedChannels: ['slack'] }}
			/>
		);
		expect(
			(getByRole('button', { name: 'Finish messaging setup' }) as HTMLButtonElement).disabled
		).toBe(false);
	});

	it('toggles a channel on Connect click and emits the new connectedChannels list', () => {
		const onPatch = vi.fn();
		const { getAllByRole } = render(
			<StepMessaging
				onFinish={vi.fn()}
				onPatch={onPatch}
				profile={{ connectedChannels: [] }}
			/>
		);
		const buttons = getAllByRole('button', { name: 'Connect' });
		const first = buttons[0];
		if (!first) throw new Error('expected at least one Connect button');
		fireEvent.click(first);
		expect(onPatch).toHaveBeenCalledWith({ connectedChannels: ['slack'] });
	});

	it('fires onFinish when Continue is clicked while at least one channel is connected', () => {
		const onFinish = vi.fn();
		const { getByRole } = render(
			<StepMessaging
				onFinish={onFinish}
				onPatch={vi.fn()}
				profile={{ connectedChannels: ['slack'] }}
			/>
		);
		fireEvent.click(getByRole('button', { name: 'Finish messaging setup' }));
		expect(onFinish).toHaveBeenCalled();
	});
});
