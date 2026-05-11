/**
 * AttachButton — opens the prompt-input file picker.
 *
 * @fileoverview Compact icon button rendered at the start of the composer
 * footer. Reads the file-input opener from the attachment context exposed by
 * the prompt-input form.
 */

'use client';

import { PlusIcon } from 'lucide-react';
import { usePromptInputAttachments } from '../../prompt-input/promptInputContext.js';
import { Button } from '../../ui/Button.js';
import { ComposerTooltip } from './ComposerTooltip.js';

/**
 * Renders the file attachment trigger bound to the prompt-input controller.
 *
 * @returns A 28px ghost button that opens the hidden file picker.
 */
export function AttachButton(): React.JSX.Element {
	const attachments = usePromptInputAttachments();
	return (
		<ComposerTooltip content="Attach files">
			<Button
				aria-label="Attach files"
				className="size-7 rounded-[var(--radius-chat-sm)] text-[var(--color-chat-muted)] hover:text-[var(--color-chat-foreground)]"
				onClick={attachments.openFileDialog}
				size="icon-xs"
				type="button"
				variant="ghost"
			>
				<PlusIcon aria-hidden="true" className="size-4" />
			</Button>
		</ComposerTooltip>
	);
}
