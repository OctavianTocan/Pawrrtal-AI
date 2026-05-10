import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePersistedState } from '@/hooks/use-persisted-state';
import {
	type ChatModelId,
	type ChatReasoningLevel,
	ModelSelectorPopover,
} from './ModelSelectorPopover';

// No mock for @octavian-tocan/react-dropdown — we want the real menu / submenu
// behaviour so the test exercises the same code path the user hits in the app.

function Harness(): React.JSX.Element {
	const [selectedModelId, setSelectedModelId] = useState<ChatModelId>('gemini-3-flash-preview');
	const [selectedReasoning, setSelectedReasoning] = useState<ChatReasoningLevel>('medium');
	return (
		<ModelSelectorPopover
			selectedModelId={selectedModelId}
			selectedReasoning={selectedReasoning}
			onSelectModel={setSelectedModelId}
			onSelectReasoning={setSelectedReasoning}
		/>
	);
}

/**
 * Click the trigger, hover the provider row to open its submenu flyout, then
 * click the named model row. Mirrors the click path a real user takes.
 */
async function pickModel(
	user: ReturnType<typeof userEvent.setup>,
	provider: RegExp,
	modelLabel: RegExp
): Promise<void> {
	const trigger = screen.getByRole('button', { name: /select model and reasoning/i });
	await user.click(trigger);
	const providerRow = await screen.findByText(provider);
	await user.hover(providerRow);
	const modelRow = await screen.findByText(modelLabel);
	await user.click(modelRow);
}

describe('ModelSelectorPopover', (): void => {
	it('updates the trigger label when the user picks a new model', async (): Promise<void> => {
		const user = userEvent.setup();
		render(<Harness />);

		const trigger = screen.getByRole('button', { name: /select model and reasoning/i });
		expect(trigger).toHaveTextContent('Gemini 3 Flash');

		await pickModel(user, /^Anthropic$/, /^Claude Sonnet 4\.6$/);

		// Trigger MUST reflect the new selection — the bug being tested is the
		// trigger staying on the old label after a click.
		expect(trigger).toHaveTextContent('Claude Sonnet 4.6');
	});

	// ─── Reproduction of the production bug ────────────────────────────────
	//
	// In ChatContainer the model id lives in `usePersistedState`, not plain
	// `useState`.  Tavi reported that clicking a model in the dropdown does
	// not switch the trigger label visually.  This test wires the component
	// the same way ChatContainer does and asserts the trigger updates.
	describe('with usePersistedState (production wiring)', (): void => {
		beforeEach((): void => {
			window.localStorage.clear();
		});

		function PersistedHarness(): React.JSX.Element {
			const [selectedModelId, setSelectedModelId] = usePersistedState<ChatModelId>({
				storageKey: 'chat-composer:selected-model-id',
				defaultValue: 'gemini-3-flash-preview',
			});
			const [selectedReasoning, setSelectedReasoning] = usePersistedState<ChatReasoningLevel>(
				{
					storageKey: 'chat-composer:selected-reasoning-level',
					defaultValue: 'medium',
				}
			);
			return (
				<ModelSelectorPopover
					selectedModelId={selectedModelId}
					selectedReasoning={selectedReasoning}
					onSelectModel={setSelectedModelId}
					onSelectReasoning={setSelectedReasoning}
				/>
			);
		}

		it('updates the trigger label when state is persisted', async (): Promise<void> => {
			const user = userEvent.setup();
			render(<PersistedHarness />);

			const trigger = screen.getByRole('button', {
				name: /select model and reasoning/i,
			});
			expect(trigger).toHaveTextContent('Gemini 3 Flash');

			await pickModel(user, /^OpenAI$/, /^GPT-5\.5$/);

			// Bug repro: the trigger should show the new model.  Production
			// reports it stays on 'Gemini 3 Flash'.
			expect(trigger).toHaveTextContent('GPT-5.5');
		});

		it('updates the trigger label inside StrictMode (double-render)', async (): Promise<void> => {
			const user = userEvent.setup();
			render(
				<StrictMode>
					<PersistedHarness />
				</StrictMode>
			);

			const trigger = screen.getByRole('button', {
				name: /select model and reasoning/i,
			});
			expect(trigger).toHaveTextContent('Gemini 3 Flash');

			await pickModel(user, /^Google$/, /^Gemini Flash Lite$/);

			expect(trigger).toHaveTextContent('Gemini Flash Lite');
		});
	});
});
