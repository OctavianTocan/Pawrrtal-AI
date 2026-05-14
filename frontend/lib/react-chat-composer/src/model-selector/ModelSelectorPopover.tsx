/**
 * ModelSelectorPopover container.
 *
 * @fileoverview Owns the Radix tooltip + dropdown coexistence guard and
 * resolves the selected model/reasoning to their display strings. Delegates
 * presentation to {@link ModelSelectorPopoverView}.
 */

'use client';

import { useTooltipDropdown } from '../hooks/useTooltipDropdown';
import type { ChatModelOption, ChatReasoningLevel } from '../types';
import {
	buildRootRows,
	getModelOption,
	getReasoningLabel,
} from './model-selector-data';
import { ModelSelectorPopoverView } from './ModelSelectorPopoverView';

/** Props for the model + reasoning selector. */
export interface ModelSelectorPopoverProps {
	/** Consumer-supplied model list. */
	models?: ChatModelOption[];
	/** Currently selected model identifier. */
	selectedModelId?: string;
	/** Fired when the user picks a model. */
	onSelectModel?: (modelId: string) => void;
	/** Consumer-supplied reasoning levels. */
	reasoningLevels?: ChatReasoningLevel[];
	/** Currently selected reasoning level. */
	selectedReasoning?: string;
	/** Fired when the user picks a reasoning level. */
	onSelectReasoning?: (level: ChatReasoningLevel) => void;
}

/**
 * Container for the model + reasoning selector.
 *
 * @returns The composer's model + reasoning picker, wired to the
 *   dropdown's tooltip-suppression timing.
 */
export function ModelSelectorPopover({
	models,
	selectedModelId,
	onSelectModel,
	reasoningLevels,
	selectedReasoning,
	onSelectReasoning,
}: ModelSelectorPopoverProps): React.JSX.Element {
	const selectedModel = getModelOption(models, selectedModelId);
	const reasoningLabel = getReasoningLabel(selectedReasoning);
	const rootRows = buildRootRows(models, reasoningLevels);
	const { menuOpen, tooltipOpen, handleMenuOpenChange, handleTooltipOpenChange } =
		useTooltipDropdown();

	return (
		<ModelSelectorPopoverView
			rootRows={rootRows}
			models={models}
			selectedModel={selectedModel}
			selectedModelId={selectedModelId}
			reasoningLevels={reasoningLevels}
			selectedReasoning={selectedReasoning}
			reasoningLabel={reasoningLabel}
			menuOpen={menuOpen}
			tooltipOpen={tooltipOpen}
			onSelectModel={onSelectModel}
			onSelectReasoning={onSelectReasoning}
			onMenuOpenChange={handleMenuOpenChange}
			onTooltipOpenChange={handleTooltipOpenChange}
		/>
	);
}
