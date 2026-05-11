/**
 * Prompt input attachment list + chip.
 *
 * @fileoverview Reads pinned attachments from the form context and renders
 * removable chips with a hover-card preview.
 */

'use client';

import { PaperclipIcon, XIcon } from 'lucide-react';
import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from '../ui/Button.js';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/Tooltip.js';
import { cn } from '../utils/cn.js';
import {
	type AttachmentFilePart,
	usePromptInputAttachments,
} from './promptInputContext.js';

/** Props for a single prompt input attachment chip. */
export interface PromptInputAttachmentProps extends HTMLAttributes<HTMLDivElement> {
	/** Attachment payload pinned to the composer. */
	data: AttachmentFilePart;
	/** Extra classes merged onto the chip. */
	className?: string;
}

/**
 * Single attachment chip rendered inside {@link PromptInputAttachments}.
 *
 * Shows a tiny thumbnail for image attachments and a paperclip glyph for
 * everything else. Hovering reveals a tooltip preview; clicking the embedded
 * remove button pops it off the list.
 *
 * @returns A removable attachment chip.
 */
export function PromptInputAttachment({
	data,
	className,
	...props
}: PromptInputAttachmentProps): React.JSX.Element {
	const attachments = usePromptInputAttachments();
	const filename = data.filename || '';
	const isImage = data.mediaType?.startsWith('image/') === true && Boolean(data.url);
	const attachmentLabel = filename || (isImage ? 'Image' : 'Attachment');

	return (
		<TooltipProvider delayDuration={0} skipDelayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={cn(
							'group relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-[var(--radius-chat-sm)] border border-[var(--color-chat-border)] px-1.5 font-medium text-sm transition-all hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_4%,transparent)]',
							className,
						)}
						{...props}
					>
						<div className="relative size-5 shrink-0">
							<div className="absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-[var(--color-chat-bg-elevated)] transition-opacity group-hover:opacity-0">
								{isImage ? (
									// Decorative thumbnail — no semantic alt because the filename is announced separately.
									<img
										alt={filename || 'attachment'}
										className="size-5 object-cover"
										height={20}
										src={data.url}
										width={20}
									/>
								) : (
									<span className="flex size-5 items-center justify-center text-[var(--color-chat-muted)]">
										<PaperclipIcon className="size-3" />
									</span>
								)}
							</div>
							<Button
								aria-label="Remove attachment"
								className="absolute inset-0 size-5 rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
								onClick={(e) => {
									e.stopPropagation();
									attachments.remove(data.id);
								}}
								type="button"
								variant="ghost"
								size="icon-xs"
							>
								<XIcon className="size-2.5" aria-hidden="true" />
								<span className="sr-only">Remove</span>
							</Button>
						</div>
						<span className="flex-1 truncate">{attachmentLabel}</span>
					</div>
				</TooltipTrigger>
				<TooltipContent side="top">{attachmentLabel}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/** Props for the attachment list. */
export interface PromptInputAttachmentsProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
	/** Renderer for each attachment. Receives the file part and returns JSX. */
	children: (attachment: AttachmentFilePart) => ReactNode;
}

/**
 * Renders the current attachment list using the consumer-provided renderer.
 *
 * Returns `null` when nothing is pinned so the composer column collapses to
 * just the textarea + footer.
 *
 * @returns The attachment row, or `null` when empty.
 */
export function PromptInputAttachments({
	children,
	className,
	...props
}: PromptInputAttachmentsProps): React.JSX.Element | null {
	const attachments = usePromptInputAttachments();
	if (!attachments.files.length) return null;
	return (
		<div
			className={cn('flex w-full flex-wrap items-center gap-2 p-3', className)}
			{...props}
		>
			{attachments.files.map((file) => (
				<Fragment key={file.id}>{children(file)}</Fragment>
			))}
		</div>
	);
}
