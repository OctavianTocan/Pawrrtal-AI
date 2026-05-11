/**
 * PlanButton — compact toolbar trigger.
 *
 * @fileoverview Renders the Plan mode pill in the composer footer. The
 * button is presentation-only — wiring lives in the consumer's
 * `footerActions` slot.
 */

'use client';

import { ListChecksIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { Button } from '../../ui/Button';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '../../ui/Tooltip';

/** Props for {@link PlanButton}. */
export interface PlanButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
	/** Tooltip primary line. Defaults to `"Create a plan"`. */
	tooltipLabel?: string;
	/** Tooltip secondary line. Defaults to `"Shift+Tab to show or hide"`. */
	tooltipHint?: string;
}

/**
 * Compact "Plan" pill used inside the composer footer.
 *
 * @returns A ghost button with the plan icon + label.
 */
export function PlanButton({
	tooltipLabel = 'Create a plan',
	tooltipHint = 'Shift+Tab to show or hide',
	className,
	...props
}: PlanButtonProps): React.JSX.Element {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={
						className ??
						'h-7 gap-1 rounded-[var(--radius-chat-sm)] px-1.5 text-[12px] font-normal text-[var(--color-chat-muted)] hover:text-[var(--color-chat-foreground)]'
					}
					type="button"
					variant="ghost"
					{...props}
				>
					<ListChecksIcon aria-hidden="true" className="size-3.5" />
					Plan
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<span className="block">{tooltipLabel}</span>
				<span className="block text-[var(--color-chat-muted)]">{tooltipHint}</span>
			</TooltipContent>
		</Tooltip>
	);
}
