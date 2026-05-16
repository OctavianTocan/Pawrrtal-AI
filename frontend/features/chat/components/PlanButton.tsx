'use client';

import { ListChecksIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/features/_shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/features/_shared/ui/tooltip';

/**
 * Host-local Plan-mode toggle rendered in the composer's `footerActions`
 * slot.
 *
 * Visual + behavior parity with the previous in-tree `PlanButton` that
 * lived inside `frontend/features/chat/components/ChatComposerControls.tsx`
 * before the chat composer was extracted to
 * `@octavian-tocan/react-chat-composer`. The package keeps composer-shell
 * concerns (textarea, voice recorder, model picker, attach button) but
 * Plan mode is a pawrrtal-specific affordance, so it ships as a thin host
 * wrapper that the host can render conditionally.
 *
 * @returns A compact tooltip-wrapped Plan trigger.
 */
export function PlanButton(): React.JSX.Element {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className="h-7 cursor-pointer gap-1 rounded-[7px] px-1.5 text-[12px] font-normal text-muted-foreground hover:text-foreground"
					type="button"
					variant="ghost"
				>
					<ListChecksIcon aria-hidden="true" className="size-3.5" />
					Plan
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<span className="block">Create a plan</span>
				<span className="block text-muted-foreground">Shift+Tab to show or hide</span>
			</TooltipContent>
		</Tooltip>
	);
}
