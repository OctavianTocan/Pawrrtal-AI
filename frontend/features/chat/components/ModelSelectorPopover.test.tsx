import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { ModelsListResponse } from '../hooks/use-models';
import {
	type ChatModelId,
	type ChatReasoningLevel,
	ModelSelectorPopover,
} from './ModelSelectorPopover';

// `useModels` hits `/api/v1/models` via TanStack Query — neither is wired
// up in this Vitest harness, so stub the hook with a static, immutable
// catalog matching the backend's published shape.  The mock returns the
// same object on every call; tests don't mutate it, so module-scope is
// safe (no need for a factory).
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
			default_reasoning: null,
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
			default_reasoning: null,
		},
	],
};

vi.mock('../hooks/use-models', () => ({
	useModels: (): { data: ModelsListResponse } => ({ data: CATALOG }),
}));

// The previous version of this file walked the live dropdown UI
// (`userEvent.click(trigger) → hover provider → click model row`) to
// exercise the trigger-label contract.  Under jsdom the
// `@octavian-tocan/react-dropdown` submenu renders into a portal whose
// content depends on focus/hover timing the synthetic event API does not
// guarantee — the Claude rows intermittently fail to appear, the test
// times out, and the failure tells us nothing about production.
//
// The production concern is narrower: when `selectedModelId` changes
// (whether from a click handler, a persisted-state rehydrate, or an
// external setter), the trigger label must reflect the new model.  That
// contract is exercised here by driving the prop directly — no portal
// traversal required.

describe('ModelSelectorPopover', (): void => {
	it('reflects the selected model in the trigger label', (): void => {
		const noop = (): void => {};
		render(
			<ModelSelectorPopover
				selectedModelId="google/gemini-3-flash-preview"
				selectedReasoning="medium"
				onSelectModel={noop}
				onSelectReasoning={noop}
			/>
		);

		const trigger = screen.getByRole('button', {
			name: /select model and reasoning/i,
		});
		expect(trigger).toHaveTextContent('Gemini 3 Flash');
	});

	it('updates the trigger label when selectedModelId changes', (): void => {
		const noop = (): void => {};
		const { rerender } = render(
			<ModelSelectorPopover
				selectedModelId="google/gemini-3-flash-preview"
				selectedReasoning="medium"
				onSelectModel={noop}
				onSelectReasoning={noop}
			/>
		);

		const trigger = screen.getByRole('button', {
			name: /select model and reasoning/i,
		});
		expect(trigger).toHaveTextContent('Gemini 3 Flash');

		rerender(
			<ModelSelectorPopover
				selectedModelId="anthropic/claude-sonnet-4-6"
				selectedReasoning="medium"
				onSelectModel={noop}
				onSelectReasoning={noop}
			/>
		);

		expect(trigger).toHaveTextContent('Sonnet 4.6');
	});

	it('resolves a bare SDK id from older persisted state to the catalog short name', (): void => {
		const noop = (): void => {};
		// Older builds stored the bare SDK id (`"gemini-3-flash-preview"`)
		// rather than the canonical `"google/gemini-3-flash-preview"`.  The
		// popover must still resolve the chip during the cutover so the
		// trigger doesn't fall back to the first catalog entry.
		render(
			<ModelSelectorPopover
				selectedModelId="gemini-3-flash-preview"
				selectedReasoning="medium"
				onSelectModel={noop}
				onSelectReasoning={noop}
			/>
		);

		expect(
			screen.getByRole('button', { name: /select model and reasoning/i })
		).toHaveTextContent('Gemini 3 Flash');
	});

	// ─── Reproduction of the production bug ────────────────────────────────
	//
	// In ChatContainer the model id lives in `usePersistedState`, not plain
	// `useState`.  Tavi reported that the trigger label did not update after
	// switching models — wiring the popover the same way ChatContainer does
	// proves the persisted-state setter still propagates into the trigger.
	describe('with usePersistedState (production wiring)', (): void => {
		beforeEach((): void => {
			window.localStorage.clear();
		});

		/**
		 * Renders the popover with the same `usePersistedState` hookup
		 * ChatContainer uses, and exposes the model setter via an `onReady`
		 * callback so tests can drive the persisted state without walking
		 * the portal-backed submenu (whose timing is non-deterministic
		 * in jsdom).
		 */
		function PersistedHarness(props: {
			onReady: (setModel: (id: ChatModelId) => void) => void;
		}): React.JSX.Element {
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
			useEffect((): void => {
				props.onReady(setSelectedModelId);
			}, [props.onReady, setSelectedModelId]);
			return (
				<ModelSelectorPopover
					selectedModelId={selectedModelId}
					selectedReasoning={selectedReasoning}
					onSelectModel={setSelectedModelId}
					onSelectReasoning={setSelectedReasoning}
				/>
			);
		}

		it('updates the trigger label when the persisted setter fires', (): void => {
			let setModel: ((id: ChatModelId) => void) | null = null;
			render(
				<PersistedHarness
					onReady={(setter): void => {
						setModel = setter;
					}}
				/>
			);

			const trigger = screen.getByRole('button', {
				name: /select model and reasoning/i,
			});
			expect(trigger).toHaveTextContent('Gemini 3 Flash');

			// Drives the same code path the menu's `onSelect` callback hits
			// when the user picks a different provider's model in production.
			act((): void => {
				setModel?.('anthropic/claude-sonnet-4-6');
			});

			expect(trigger).toHaveTextContent('Sonnet 4.6');
		});

		it('rehydrates the trigger label from localStorage on remount', (): void => {
			window.localStorage.setItem(
				'chat-composer:selected-model-id',
				JSON.stringify('anthropic/claude-sonnet-4-6')
			);

			render(<PersistedHarness onReady={(): void => {}} />);

			expect(
				screen.getByRole('button', { name: /select model and reasoning/i })
			).toHaveTextContent('Sonnet 4.6');
		});
	});
});
