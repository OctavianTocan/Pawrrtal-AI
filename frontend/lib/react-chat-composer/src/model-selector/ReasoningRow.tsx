/**
 * ReasoningRow — single reasoning-level entry in the submenu.
 *
 * @fileoverview Clickable row that selects a reasoning level and closes the
 * root dropdown.
 */

'use client';

import { useDropdownContext } from '@octavian-tocan/react-dropdown';
import { CheckIcon } from 'lucide-react';
import type { ChatReasoningLevel } from '../types/index';

/** Props for {@link ReasoningRow}. */
export interface ReasoningRowProps {
	/** The reasoning-level identifier rendered as the row label. */
	level: ChatReasoningLevel;
	/** Whether this row matches the currently-selected level. */
	isSelected: boolean;
	/** Fired with the level on select. */
	onSelect: (level: ChatReasoningLevel) => void;
}

/**
 * Submenu row that selects a reasoning level and closes the dropdown.
 *
 * @returns A clickable reasoning-level row with a trailing checkmark when selected.
 */
export function ReasoningRow({ level, isSelected, onSelect }: ReasoningRowProps): React.JSX.Element {
	const { closeDropdown } = useDropdownContext();
	return (
		<button
			type="button"
			className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_4%,transparent)]"
			onPointerDown={(e) => {
				e.preventDefault();
				onSelect(level);
				closeDropdown();
			}}
		>
			<span>{level}</span>
			{isSelected ? (
				<CheckIcon
					aria-hidden="true"
					className="size-3.5 text-[var(--color-chat-foreground)]"
				/>
			) : null}
		</button>
	);
}
