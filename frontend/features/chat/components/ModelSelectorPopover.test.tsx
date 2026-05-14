import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { ModelsListResponse } from '../hooks/use-models';
import {
	type ChatModelId,
	type ChatReasoningLevel,
	ModelSelectorPopover,
} from './ModelSelectorPopover';

// `useModels` hits `/api/v1/models` via TanStack Query — neither is wired
// up in this Vitest harness, so stub the hook with a static catalog that
// matches the backend's published shape.  Using factory-style data keeps
// each test isolated (no shared mutable mock array).
const CATALOG: ModelsListResponse = {
	default_canonical_id: 'google/gemini-3-flash-preview',
	models: [
		{
			canonical_id: 'anthropic/claude-sonnet-4-6',
			provider: 'anthropic',
			sdk_id: 'claude-sonnet-4-6',
			display_name: 'Claude Sonnet 4.6',
			short_name: 'Sonnet 4.6',
			description: 'Balanced for everyday tasks',
			context_window: 200_000,
			supports_thinking: true,
			supports_tool_use: true,
			supports_prompt_cache: true,
			default_reasoning: 'medium',
		},
		{
			canonical_id: 'google/gemini-3-flash-preview',
			provider: 'google',
			sdk_id: 'gemini-3-flash-preview',
			display_name: 'Gemini 3 Flash Preview',
			short_name: 'Gemini 3 Flash',
			description: "Google's frontier multimodal",
			context_window: 1_000_000,
			supports_thinking: false,
			supports_tool_use: true,
			supports_prompt_cache: false,
			default_reasoning: 'off',
		},
		{
			canonical_id: 'google/gemini-3.1-flash-lite-preview',
			provider: 'google',
			sdk_id: 'gemini-3.1-flash-lite-preview',
			display_name: 'Gemini 3.1 Flash Lite Preview',
			short_name: 'Gemini Flash Lite',
			description: 'Light and fast Gemini',
			context_window: 1_000_000,
			supports_thinking: false,
			supports_tool_use: true,
			supports_prompt_cache: false,
			default_reasoning: 'off',
		},
	],
};

vi.mock('../hooks/use-models', () => ({
	useModels: (): { data: ModelsListResponse } => ({ data: CATALOG }),
}));

// No mock for @octavian-tocan/react-dropdown — we want the real menu / submenu
// behaviour so the test exercises the same code path the user hits in the app.

function Harness(): React.JSX.Element {
	// Older builds persist the bare SDK id; the popover must still resolve
	// it to a catalog row so the chip renders correctly during the cutover.
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
				defaultValue: 'google/gemini-3-flash-preview',
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

			await pickModel(user, /^Anthropic$/, /^Claude Sonnet 4\.6$/);

			// Bug repro: the trigger should show the new model.  Production
			// reports it stays on the old label.
			expect(trigger).toHaveTextContent('Claude Sonnet 4.6');
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
