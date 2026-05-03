'use client';

import { GithubIcon, GitPullRequestIcon, WorkflowIcon } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Suggested empty-state prompts displayed below the chat composer. */
export const CHAT_PROMPT_SUGGESTIONS = [
  {
    id: 'review-commits',
    label: 'Review my recent commits for correctness risks and maintainability concerns',
    icon: GitPullRequestIcon,
  },
  {
    id: 'unblock-pr',
    label: 'Unblock my most recent open PR',
    icon: GithubIcon,
  },
  {
    id: 'connect-apps',
    label: 'Connect my favorite apps to AI Nexus',
    icon: WorkflowIcon,
  },
] as const;

/** Props for the empty-state prompt suggestion list. */
export type ChatPromptSuggestionsProps = {
  /** Callback fired when a suggestion is selected. */
  onSelectSuggestion: (prompt: string) => void;
  /** Additional classes for the root list. */
  className?: string;
};

/**
 * Renders compact Codex-like suggested prompt rows for an empty conversation.
 */
export function ChatPromptSuggestions({
  onSelectSuggestion,
  className,
}: ChatPromptSuggestionsProps): React.JSX.Element {
  return (
    <div className={cn('w-full max-w-[48.75rem]', className)}>
      {CHAT_PROMPT_SUGGESTIONS.map((suggestion) => {
        const Icon = suggestion.icon;

        return (
          <Tooltip key={suggestion.id}>
            <TooltipTrigger asChild>
              <Button
                className="group h-auto w-full justify-start rounded-none border-0 border-foreground/10 border-t bg-transparent px-3 py-3 text-left text-[13px] font-normal text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
                onClick={() => onSelectSuggestion(suggestion.label)}
                type="button"
                variant="ghost"
              >
                <span className="flex min-w-0 items-center gap-2 px-1.5 py-1 transition-colors group-hover:text-foreground">
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              {suggestion.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
