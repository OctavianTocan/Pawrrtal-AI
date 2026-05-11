'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '../utils/cn';

/**
 * Re-export Radix Tooltip primitives directly so consumers can compose them
 * for advanced cases. The default `TooltipContent` below applies the chat-*
 * token styling so the package's components don't have to repeat it.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

/** Props for the styled `TooltipContent`. */
export interface TooltipContentProps extends TooltipPrimitive.TooltipContentProps {
	children: ReactNode;
}

/**
 * Styled wrapper around `Radix.TooltipContent`. Defaults `sideOffset` to 4 to
 * match the spacing the composer uses.
 *
 * @returns The tooltip content rendered inside Radix's portal.
 */
export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(function TooltipContent(
	{ className, sideOffset = 4, ...rest },
	ref,
) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				className={cn(
					'z-50 overflow-hidden rounded-[var(--radius-chat-sm)] bg-[var(--color-chat-foreground)] px-2 py-1 text-[12px] text-[var(--color-chat-bg-elevated)] shadow-[var(--shadow-chat-minimal)]',
					className,
				)}
				{...rest}
			/>
		</TooltipPrimitive.Portal>
	);
});
