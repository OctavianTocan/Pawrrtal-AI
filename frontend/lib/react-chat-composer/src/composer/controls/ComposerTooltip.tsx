/**
 * Shared tooltip wrapper for compact composer controls.
 *
 * @fileoverview Wraps a `<TooltipTrigger asChild>` + `<TooltipContent>` pair
 * around any inline element so the composer toolbar stays consistent.
 */

'use client';

import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/Tooltip';

/** Props for the shared composer tooltip. */
export interface ComposerTooltipProps {
	/** The trigger element rendered inline. */
	children: ReactNode;
	/** Tooltip body text. */
	content: string;
}

/**
 * Tooltip wrapper used by every compact button in the composer toolbar.
 *
 * @returns The trigger child with a paired tooltip popover.
 */
export function ComposerTooltip({
	children,
	content,
}: ComposerTooltipProps): React.JSX.Element {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex">{children}</span>
			</TooltipTrigger>
			<TooltipContent side="top">{content}</TooltipContent>
		</Tooltip>
	);
}
