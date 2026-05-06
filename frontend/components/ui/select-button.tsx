'use client';

/**
 * SelectButton — a small DropdownMenu-driven picker that matches the
 * chat composer's model selector styling.
 *
 * Use this instead of a native `<select>` whenever you need a compact
 * "trigger → dropdown of options → pick one" control. The trigger is
 * a `Button` with the project's chat-composer chrome (subtle ghost
 * hover, no border, chevron on the right); the dropdown reuses
 * `chat-composer-dropdown-menu` so the popover skin stays consistent
 * with the model picker.
 *
 * Renders nothing for the popover frame, hover styles, or item
 * structure — those live in `<DropdownMenu>` / `<DropdownMenuItem>` so
 * theme overrides land via the shared cascade.
 */

import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** A single picker option. `id` is what gets passed to `onSelect`. */
export interface SelectButtonOption {
	id: string;
	label: React.ReactNode;
	/** Optional secondary line under the label (small, muted). */
	description?: React.ReactNode;
	/** Optional left-side leading visual (icon, swatch, avatar). */
	leading?: React.ReactNode;
}

export interface SelectButtonProps {
	/** Accessible name for the trigger button. */
	ariaLabel: string;
	/** Trigger label — usually the active option's name or a placeholder. */
	triggerLabel: React.ReactNode;
	/** Trigger leading visual — small swatch, icon, etc. */
	triggerLeading?: React.ReactNode;
	/** Options listed in the dropdown. */
	options: readonly SelectButtonOption[];
	/** Called with the chosen option's id when the user picks one. */
	onSelect: (id: string) => void;
	/** Currently-active option id (renders a subtle indicator on the row). */
	activeId?: string | null;
	/** Override classes on the trigger button. */
	className?: string;
}

/**
 * DropdownMenu-driven select button.
 *
 * The trigger styling mirrors the model selector in
 * `features/chat/components/ModelSelectorPopover.tsx` (rounded-[7px],
 * ghost variant, chevron). The popover uses `chat-composer-dropdown-menu`
 * so backgrounds, borders, and shadows stay consistent.
 */
export function SelectButton({
	ariaLabel,
	triggerLabel,
	triggerLeading,
	options,
	onSelect,
	activeId,
	className,
}: SelectButtonProps): React.JSX.Element {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={ariaLabel}
					className={cn(
						'h-8 gap-1.5 rounded-[7px] border-0 bg-foreground/[0.04] px-2.5 text-xs font-medium text-foreground',
						'hover:bg-foreground/[0.08] aria-expanded:bg-foreground/[0.10] data-[state=open]:bg-foreground/[0.10]',
						'transition-colors duration-150 ease-out',
						className
					)}
					size="xs"
					type="button"
					variant="ghost"
				>
					{triggerLeading ? (
						<span className="flex items-center">{triggerLeading}</span>
					) : null}
					<span className="truncate">{triggerLabel}</span>
					<ChevronDownIcon aria-hidden="true" className="size-3 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="chat-composer-dropdown-menu min-w-56 p-1.5"
				side="bottom"
				sideOffset={4}
			>
				{options.map((option) => {
					const isActive = activeId === option.id;
					return (
						<DropdownMenuItem
							className={cn(
								// Compact-but-readable Codex rhythm: ~36px tall rows
								// (py-2 + line-height) with a slightly chunkier corner
								// radius so the hover/active fill reads as its own pill
								// rather than a thin highlight strip.
								'gap-2.5 rounded-[8px] px-3 py-2',
								// Active row gets a tinted background — replaces the
								// previous tiny right-edge dot, which was easy to miss
								// against the muted chrome.
								isActive && 'bg-foreground/[0.06]'
							)}
							key={option.id}
							onSelect={() => onSelect(option.id)}
						>
							{option.leading ? (
								<span aria-hidden="true" className="flex items-center">
									{option.leading}
								</span>
							) : null}
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-sm text-foreground">
									{option.label}
								</span>
								{option.description ? (
									<span className="truncate text-pretty text-xs text-muted-foreground">
										{option.description}
									</span>
								) : null}
							</div>
							{isActive ? (
								<CheckIcon
									aria-hidden="true"
									className="size-3.5 shrink-0 text-foreground"
								/>
							) : null}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
