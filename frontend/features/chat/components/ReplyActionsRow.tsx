'use client';

import { CheckIcon, CopyIcon, RefreshCwIcon, Share2Icon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
 * assistant message. Mirrors the thirdear `ReplyActionsView` layout —
 * 28px-tall ghost buttons with icons + small labels.
 */
export function ReplyActionsRow({
	onCopy,
	isCopied,
	onRegenerate,
	isRegenerating,
	onShare,
	className,
}: ReplyActionsRowProps): ReactNode {
	const buttonClass =
		'h-7 gap-1.5 px-2 text-muted-foreground text-xs hover:bg-muted hover:text-foreground';

	return (
		<div className={cn('mt-1 flex items-center gap-0.5', className)}>
			{onCopy ? (
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
					<span>{isCopied ? 'Copied' : 'Copy'}</span>
				</Button>
			) : null}
			{onRegenerate ? (
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
					<span>{isRegenerating ? 'Regenerating' : 'Regenerate'}</span>
				</Button>
			) : null}
			{onShare ? (
				<Button
					aria-label="Share message"
					className={buttonClass}
					onClick={onShare}
					size="sm"
					type="button"
					variant="ghost"
				>
					<Share2Icon className="size-3.5" />
					<span>Share</span>
				</Button>
			) : null}
		</div>
	);
}
