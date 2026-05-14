/**
 * ChatPromptSuggestions — empty-state suggestion list.
 *
 * @fileoverview Renders compact suggested-prompt rows below the chat
 * composer. Each row has a click target (inserts the prompt) and a dismiss
 * affordance.
 */

'use client';

import { XIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/Tooltip';
import { cn } from '../utils/cn';
import type { ChatPromptSuggestion } from '../types';

/** Props for {@link ChatPromptSuggestions}. */
export interface ChatPromptSuggestionsProps {
	/** Suggestion list. Each entry must carry a stable `id`. */
	suggestions: ChatPromptSuggestion[];
	/** Callback fired when a suggestion is selected. */
	onSelectSuggestion: (prompt: string) => void;
	/** Optional resolver for the leading icon column. */
	getIcon?: (suggestion: ChatPromptSuggestion) => ReactNode;
	/** Extra classes for the root list container. */
	className?: string;
}

function SuggestionIcon({
	getIcon,
	suggestion,
}: {
	getIcon?: (suggestion: ChatPromptSuggestion) => ReactNode;
	suggestion: ChatPromptSuggestion;
}): React.JSX.Element | null {
	if (!getIcon) return null;
	return (
		<span aria-hidden="true" className="shrink-0 text-[var(--color-chat-muted)]">
			{getIcon(suggestion)}
		</span>
	);
}

/**
 * Compact suggested-prompt rows for an empty conversation.
 *
 * Local-state dismissal — once a suggestion is dismissed it stays hidden
 * for the lifetime of the component instance. Consumers that need
 * persistent dismissal should manage the list themselves.
 *
 * @returns A vertical stack of suggested-prompt rows.
 */
export function ChatPromptSuggestions({
	suggestions,
	onSelectSuggestion,
	getIcon,
	className,
}: ChatPromptSuggestionsProps): React.JSX.Element {
	const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(() => new Set());
	const visibleSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));

	return (
		<TooltipProvider delayDuration={0} skipDelayDuration={0}>
			<div className={cn('w-full max-w-[48.75rem]', className)}>
				{visibleSuggestions.map((suggestion) => (
					<div
						className="group/suggestion flex w-full items-stretch border-[color:color-mix(in_oklch,var(--color-chat-foreground)_10%,transparent)] border-t first:border-t-0"
						key={suggestion.id}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									className="flex min-w-0 flex-1 items-center gap-2 bg-transparent p-3 text-left text-[13px] font-normal transition-colors hover:bg-transparent"
									onClick={() => onSelectSuggestion(suggestion.label)}
									type="button"
								>
									<SuggestionIcon getIcon={getIcon} suggestion={suggestion} />
									<span className="min-w-0 flex-1 truncate text-[var(--color-chat-muted)] transition-colors group-hover/suggestion:text-[var(--color-chat-foreground)]">
										{suggestion.label}
									</span>
								</button>
							</TooltipTrigger>
							<TooltipContent align="start" side="top">
								{suggestion.label}
							</TooltipContent>
						</Tooltip>
						<button
							aria-label={`Dismiss suggestion: ${suggestion.label}`}
							className="flex shrink-0 items-center justify-center bg-transparent px-3 text-[var(--color-chat-muted)] transition-colors hover:bg-transparent hover:text-[var(--color-chat-foreground)]"
							onClick={() => {
								setDismissedIds((previous) => {
									const next = new Set(previous);
									next.add(suggestion.id);
									return next;
								});
							}}
							type="button"
						>
							<XIcon aria-hidden="true" className="size-4" />
						</button>
					</div>
				))}
			</div>
		</TooltipProvider>
	);
}
