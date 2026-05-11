/**
 * ModelRow — single model entry in the model selector submenu.
 *
 * @fileoverview Clickable row that selects a model and closes the root
 * dropdown. The submenu is rendered inside the root dropdown so
 * `useDropdownContext` resolves to the root context.
 */

'use client';

import { useDropdownContext } from '@octavian-tocan/react-dropdown';
import { CheckIcon } from 'lucide-react';
import type { ChatModelOption } from '../types/index.js';

/** Props for {@link ModelRow}. */
export interface ModelRowProps {
	/** The model option being rendered. */
	model: ChatModelOption;
	/** Whether this row matches the currently-selected model. */
	isSelected: boolean;
	/** Fired with the row's model ID on select. */
	onSelect: (modelId: string) => void;
}

/**
 * Submenu row that selects a model and collapses the entire dropdown chain.
 *
 * @returns A clickable model row with a trailing checkmark when selected.
 */
export function ModelRow({ model, isSelected, onSelect }: ModelRowProps): React.JSX.Element {
	const { closeDropdown } = useDropdownContext();
	return (
		<button
			type="button"
			className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_4%,transparent)]"
			onPointerDown={(e) => {
				e.preventDefault();
				onSelect(model.id);
				closeDropdown();
			}}
		>
			<div className="flex min-w-0 flex-1 flex-col text-left">
				<span className="truncate text-[var(--color-chat-foreground)]">{model.shortName}</span>
				<span className="truncate text-[11px] text-[var(--color-chat-muted)]">
					{model.description}
				</span>
			</div>
			{isSelected ? (
				<CheckIcon
					aria-hidden="true"
					className="size-3.5 shrink-0 text-[var(--color-chat-foreground)]"
				/>
			) : null}
		</button>
	);
}
