/**
 * Prompt input attachment UI.
 *
 * @fileoverview Attachment preview, list, and add-action components for prompt inputs.
 */

'use client';

import { DropdownMenuItem } from '@octavian-tocan/react-dropdown';
import type { FileUIPart } from 'ai';
import { ImageIcon, PaperclipIcon, XIcon } from 'lucide-react';
import { type ComponentProps, Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePromptInputAttachments } from './prompt-input-context';
import {
	PromptInputHoverCard,
	PromptInputHoverCardContent,
	PromptInputHoverCardTrigger,
} from './prompt-input-layout';

/** Props for a single prompt input attachment chip. */
export type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
	data: FileUIPart & { id: string };
	className?: string;
};

/** Attachment chip with preview and remove behavior. */
export function PromptInputAttachment({ data, className, ...props }: PromptInputAttachmentProps) {
	const attachments = usePromptInputAttachments();
	const filename = data.filename || '';
	const mediaType = data.mediaType?.startsWith('image/') && data.url ? 'image' : 'file';
	const isImage = mediaType === 'image';
	const attachmentLabel = filename || (isImage ? 'Image' : 'Attachment');

	return (
		<PromptInputHoverCard>
			<PromptInputHoverCardTrigger asChild>
				<div
					className={cn(
						'group relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md border border-border px-1.5 font-medium text-sm transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
						className
					)}
					key={data.id}
					{...props}
				>
					<div className="relative size-5 shrink-0">
						<div className="absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-background transition-opacity group-hover:opacity-0">
							{isImage ? (
								<img
									alt={filename || 'attachment'}
									className="size-5 object-cover"
									height={20}
									src={data.url}
									width={20}
								/>
							) : (
								<div className="flex size-5 items-center justify-center text-muted-foreground">
									<PaperclipIcon className="size-3" />
								</div>
							)}
						</div>
						<Button
							aria-label="Remove attachment"
							className="absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5"
							onClick={(e) => {
								e.stopPropagation();
								attachments.remove(data.id);
							}}
							type="button"
							variant="ghost"
						>
							<XIcon />
							<span className="sr-only">Remove</span>
						</Button>
					</div>

					<span className="flex-1 truncate">{attachmentLabel}</span>
				</div>
			</PromptInputHoverCardTrigger>
			<PromptInputHoverCardContent className="w-auto p-2">
				<div className="w-auto space-y-3">
					{isImage && (
						<div className="flex max-h-96 w-96 items-center justify-center overflow-hidden rounded-md border">
							<img
								alt={filename || 'attachment preview'}
								className="max-h-full max-w-full object-contain"
								height={384}
								src={data.url}
								width={448}
							/>
						</div>
					)}
					<div className="flex items-center gap-2.5">
						<div className="min-w-0 flex-1 space-y-1 px-0.5">
							<h4 className="truncate font-semibold text-sm leading-none">
								{filename || (isImage ? 'Image' : 'Attachment')}
							</h4>
							{data.mediaType && (
								<p className="truncate font-mono text-muted-foreground text-xs">
									{data.mediaType}
								</p>
							)}
						</div>
					</div>
				</div>
			</PromptInputHoverCardContent>
		</PromptInputHoverCard>
	);
}

/** Props for rendering the current attachment list. */
export type PromptInputAttachmentsProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
	children: (attachment: FileUIPart & { id: string }) => ReactNode;
};

/** Attachment list renderer for the current prompt input. */
export function PromptInputAttachments({
	children,
	className,
	...props
}: PromptInputAttachmentsProps) {
	const attachments = usePromptInputAttachments();

	if (!attachments.files.length) {
		return null;
	}

	return (
		<div className={cn('flex w-full flex-wrap items-center gap-2 p-3', className)} {...props}>
			{attachments.files.map((file) => (
				<Fragment key={file.id}>{children(file)}</Fragment>
			))}
		</div>
	);
}

/** Props for the action that opens the prompt input file chooser. */
export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof DropdownMenuItem> & {
	label?: string;
};

/** Menu item that opens the prompt input file chooser. */
export const PromptInputActionAddAttachments = ({
	label = 'Add photos or files',
	...props
}: PromptInputActionAddAttachmentsProps) => {
	const attachments = usePromptInputAttachments();

	return (
		<DropdownMenuItem
			{...props}
			onSelect={(e) => {
				e.preventDefault();
				attachments.openFileDialog();
			}}
		>
			<ImageIcon className="mr-2 size-4" /> {label}
		</DropdownMenuItem>
	);
};
