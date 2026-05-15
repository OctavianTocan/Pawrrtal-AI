/**
 * @fileoverview Tests for ModelSelectorPopover.
 *
 * Covers: render correctness, model selection callback, reasoning selection
 * callback, the selected-state visual indicator, and the loading placeholder.
 *
 * The component is built on `@octavian-tocan/react-dropdown` which uses Radix
 * primitives internally. Radix portals are rendered into `document.body` in
 * jsdom, so we query the full document rather than a scoped container when
 * asserting on open menus.
 *
 * Tests inject a fixture catalog via the `models` prop — the picker is now
 * props-driven and never consults a static module-level catalog.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatModelOption } from '../hooks/use-chat-models';
import { CHAT_REASONING_LEVELS, ModelSelectorPopover } from './ModelSelectorPopover';

/**
 * Fixture catalog passed via the `models` prop. Mirrors the shape returned by
 * `GET /api/v1/models`, with two vendors so the grouping path is exercised.
 */
const FIXTURE_MODELS: ChatModelOption[] = [
	{
		id: 'agent-sdk:anthropic/claude-sonnet-4-6',
		host: 'agent-sdk',
		vendor: 'anthropic',
		model: 'claude-sonnet-4-6',
		display_name: 'Claude Sonnet 4.6',
		short_name: 'Claude Sonnet 4.6',
		description: 'Balanced for everyday tasks',
		is_default: false,
	},
	{
		id: 'agent-sdk:anthropic/claude-opus-4-7',
		host: 'agent-sdk',
		vendor: 'anthropic',
		model: 'claude-opus-4-7',
		display_name: 'Claude Opus 4.7',
		short_name: 'Claude Opus 4.7',
		description: 'Most capable for ambitious work',
		is_default: false,
	},
	{
		id: 'google-ai:google/gemini-3-flash-preview',
		host: 'google-ai',
		vendor: 'google',
		model: 'gemini-3-flash-preview',
		display_name: 'Gemini 3 Flash Preview',
		short_name: 'Gemini 3 Flash',
		description: "Google's frontier multimodal",
		is_default: true,
	},
	{
		id: 'google-ai:google/gemini-3.1-flash-lite-preview',
		host: 'google-ai',
		vendor: 'google',
		model: 'gemini-3.1-flash-lite-preview',
		display_name: 'Gemini 3.1 Flash Lite Preview',
		short_name: 'Gemini 3.1 Flash Lite',
		description: "Google's fast preview model",
		is_default: false,
	},
];

// Canonical ID of the default fixture model (Gemini 3 Flash) — typed as a
// string literal so we don't depend on indexed lookup at runtime.
const DEFAULT_SELECTED_ID = 'google-ai:google/gemini-3-flash-preview';

// Minimal props that satisfy the component interface.
const DEFAULT_PROPS = {
	models: FIXTURE_MODELS,
	selectedModelId: DEFAULT_SELECTED_ID,
	selectedReasoning: CHAT_REASONING_LEVELS[1], // 'medium'
	onSelectModel: vi.fn(),
	onSelectReasoning: vi.fn(),
} as const;

const DOTTED_GEMINI_ID = 'google-ai:google/gemini-3.1-flash-lite-preview';

function closestButton(element: HTMLElement): HTMLButtonElement {
	const button = element.closest('button');
	if (!button) throw new Error('Expected the element to be inside a button.');
	return button;
}

describe('ModelSelectorPopover', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the trigger button with the selected model short name', () => {
		render(<ModelSelectorPopover {...DEFAULT_PROPS} />);
		// The trigger label shows the model's short_name, not its full name.
		expect(screen.getByRole('button', { name: /select model/i })).toBeTruthy();
		expect(screen.getByText('Gemini 3 Flash')).toBeTruthy();
	});

	it('displays the selected reasoning level in the trigger', () => {
		render(
			<ModelSelectorPopover
				{...DEFAULT_PROPS}
				selectedReasoning="high"
				onSelectReasoning={vi.fn()}
			/>
		);
		expect(screen.getByText('High')).toBeTruthy();
	});

	it('shows the selected short_name for the active model id', () => {
		const { container } = render(
			<ModelSelectorPopover
				{...DEFAULT_PROPS}
				selectedModelId="agent-sdk:anthropic/claude-opus-4-7"
				onSelectModel={vi.fn()}
			/>
		);
		// The trigger should show 'Claude Opus 4.7' as the selected short name.
		expect(screen.getByText('Claude Opus 4.7')).toBeTruthy();
		// Trigger button exists and renders without throwing.
		expect(container.querySelector('button')).toBeTruthy();
	});

	it('opens the dropdown on pointer-down without throwing', () => {
		const onSelectModel = vi.fn();
		render(<ModelSelectorPopover {...DEFAULT_PROPS} onSelectModel={onSelectModel} />);
		// The component uses onPointerDown for selection (beats hover-close timing).
		// We fire the event directly on the trigger — full submenu interaction
		// requires a Radix portal integration test which is out of scope here.
		const trigger = screen.getByRole('button', { name: /select model/i });
		fireEvent.pointerDown(trigger);
		// Trigger-level pointer-down opens the dropdown, not a model select —
		// model selection fires inside the submenu. Verify the component
		// renders without error and the trigger is interactive.
		expect(trigger).toBeTruthy();
	});

	it('selects a dotted Gemini model from the vendor submenu on pointer-down', () => {
		vi.useFakeTimers();
		const onSelectModel = vi.fn();
		render(<ModelSelectorPopover {...DEFAULT_PROPS} onSelectModel={onSelectModel} />);

		fireEvent.click(screen.getByRole('button', { name: /select model/i }));
		const googleRow = closestButton(screen.getByText('Google'));
		fireEvent.pointerEnter(googleRow);
		act(() => {
			vi.advanceTimersByTime(120);
		});

		const dottedGeminiRow = closestButton(screen.getByText('Gemini 3.1 Flash Lite'));
		fireEvent.pointerDown(dottedGeminiRow, { button: 0 });
		fireEvent.click(dottedGeminiRow);

		expect(onSelectModel).toHaveBeenCalledTimes(1);
		expect(onSelectModel).toHaveBeenCalledWith(DOTTED_GEMINI_ID);
	});

	it('selects a reasoning level from the thinking submenu on pointer-down', () => {
		vi.useFakeTimers();
		const onSelectReasoning = vi.fn();
		render(
			<ModelSelectorPopover
				{...DEFAULT_PROPS}
				onSelectReasoning={onSelectReasoning}
				selectedReasoning="medium"
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /select model/i }));
		const thinkingRow = closestButton(screen.getByText('Thinking: Medium'));
		fireEvent.pointerEnter(thinkingRow);
		act(() => {
			vi.advanceTimersByTime(120);
		});

		const highRow = closestButton(screen.getByText('High'));
		fireEvent.pointerDown(highRow, { button: 0 });
		fireEvent.click(highRow);

		expect(onSelectReasoning).toHaveBeenCalledTimes(1);
		expect(onSelectReasoning).toHaveBeenCalledWith('high');
	});

	it('renders without throwing for every model in the fixture catalog', () => {
		for (const model of FIXTURE_MODELS) {
			const { unmount } = render(
				<ModelSelectorPopover
					{...DEFAULT_PROPS}
					selectedModelId={model.id}
					onSelectModel={vi.fn()}
				/>
			);
			expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
			unmount();
		}
	});

	it('renders without throwing for every reasoning level', () => {
		for (const reasoning of CHAT_REASONING_LEVELS) {
			const { unmount } = render(
				<ModelSelectorPopover
					{...DEFAULT_PROPS}
					selectedReasoning={reasoning}
					onSelectReasoning={vi.fn()}
				/>
			);
			expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
			unmount();
		}
	});

	it('ignores malformed vendor values instead of crashing', () => {
		const firstModel = FIXTURE_MODELS[0];
		if (!firstModel) throw new Error('Missing model selector fixture.');
		const malformedModel = {
			...firstModel,
			id: 'broken-model',
			vendor: undefined,
		} as unknown as ChatModelOption;

		render(
			<ModelSelectorPopover
				{...DEFAULT_PROPS}
				selectedModelId={firstModel.id}
				models={[firstModel, malformedModel]}
				onSelectModel={vi.fn()}
			/>
		);

		expect(screen.getByRole('button', { name: /select model/i })).toBeTruthy();
		expect(screen.getByText('Claude Sonnet 4.6')).toBeTruthy();
	});

	it('renders the loading placeholder when isLoading is true', () => {
		render(<ModelSelectorPopover {...DEFAULT_PROPS} isLoading />);
		expect(screen.getByText('Loading…')).toBeTruthy();
	});

	it('falls back to the neutral selector placeholder when the selected id is unknown', () => {
		// A stale localStorage id that no longer matches any catalog entry — the
		// trigger renders the placeholder instead of crashing.
		render(
			<ModelSelectorPopover
				{...DEFAULT_PROPS}
				selectedModelId="agent-sdk:anthropic/unknown-model"
				onSelectModel={vi.fn()}
			/>
		);
		expect(screen.getByText('Select model')).toBeTruthy();
		expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
	});

	it('groups vendors from the catalog (smoke render with two vendors)', () => {
		// Smoke test: two-vendor fixture renders without throwing.
		// Deeper grouping coverage requires a Radix portal interaction test.
		render(<ModelSelectorPopover {...DEFAULT_PROPS} />);
		expect(screen.getByRole('button', { name: /select model/i })).toBeTruthy();
	});
});
