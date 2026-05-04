'use client';

import { CheckIcon, CopyIcon, RefreshCwIcon, Share2Icon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Props for {@link ReplyActionsRow}.
 *
 * All action callbacks are optional — passing `undefined` simply hides the
 * matching button so the same component can render reduced toolbars (e.g.
 * the failed-message variant has no copy/share, only retry).
 */
interface ReplyActionsRowProps {
	/** Copy current reply text to the clipboard. */
	onCopy?: () => void;
	/** Whether the copy button should currently render its "Copied!" state. */
	isCopied?: boolean;
	/** Re-run the assistant turn for this reply. */
	onRegenerate?: () => void;
	/** Whether a regeneration request is currently in flight. */
	isRegenerating?: boolean;
	/** Share / link-copy hook (mirrors thirdear's share button slot). */
	onShare?: () => void;
	/** Optional extra padding tweaks from the parent. */
	className?: string;
}

/**
 * Compact row of reply actions (copy, regenerate, share) under a completed
 * assistant message. Icon-only square ghost buttons — text labels live on
 * `aria-label` and the native `title` attribute so screen readers and
 * hover tooltips both work without crowding the chat with chrome.
 */
export function ReplyActionsRow({
	onCopy,
	isCopied,
	onRegenerate,
	isRegenerating,
	onShare,
	className,
}: ReplyActionsRowProps): ReactNode {
	const buttonClass = 'size-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground';

	return (
		<div className={cn('mt-1 flex items-center gap-0.5', className)}>
			{onCopy ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label={isCopied ? 'Copied' : 'Copy message'}
							className={buttonClass}
							onClick={onCopy}
							size="sm"
							type="button"
							variant="ghost"
						>
							{isCopied ? (
								<CheckIcon className="size-3.5" />
							) : (
								<CopyIcon className="size-3.5" />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{isCopied ? 'Copied' : 'Copy'}</TooltipContent>
				</Tooltip>
			) : null}
			{onRegenerate ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label="Regenerate response"
							className={buttonClass}
							disabled={isRegenerating}
							onClick={onRegenerate}
							size="sm"
							type="button"
							variant="ghost"
						>
							<RefreshCwIcon
								className={cn('size-3.5', isRegenerating ? 'animate-spin' : null)}
							/>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						{isRegenerating ? 'Regenerating' : 'Regenerate'}
					</TooltipContent>
				</Tooltip>
			) : null}
			{onShare ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label="Share message"
							className={buttonClass}
							onClick={onShare}
							size="sm"
							type="button"
							variant="ghost"
						>
							<Share2Icon className="size-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Share</TooltipContent>
				</Tooltip>
			) : null}
		</div>
	);
}
