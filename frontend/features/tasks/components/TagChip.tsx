/**
 * Inline `#tag` chip rendered in the metadata strip under a task title.
 *
 * Visually quieter than {@link ProjectChip} so the project chip stays the
 * row's primary right-edge anchor. Uses a low-alpha foreground fill so it
 * automatically tints with the page background in dark mode.
 */

import type { ReactNode } from 'react';

export interface TagChipProps {
	/** Tag label without the leading `#`. The chip prepends it visually. */
	label: string;
}

/**
 * Pure presentation — no hooks, no event handlers. Tag interaction (filter
 * by tag, etc.) lives upstream so the chip is reusable from search results
 * or inline mentions later.
 */
export function TagChip({ label }: TagChipProps): ReactNode {
	return (
		<span className="inline-flex h-5 items-center rounded-md bg-foreground/[0.04] px-1.5 text-[11px] font-medium text-muted-foreground">
			<span aria-hidden="true" className="opacity-60">
				#
			</span>
			{label}
		</span>
	);
}
