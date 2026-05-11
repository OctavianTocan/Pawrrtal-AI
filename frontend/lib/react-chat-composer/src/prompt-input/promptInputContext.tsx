/**
 * Prompt input attachment context.
 *
 * @fileoverview Shared React context that the form, textarea, and attachment
 * components use to coordinate file pinning. Mirrors the AI Elements API
 * surface but trimmed to what the chat composer actually consumes — no
 * external `PromptInputProvider` is exported; the form sets up the context
 * internally.
 */

'use client';

import {
	createContext,
	type RefObject,
	useContext,
} from 'react';

/**
 * Public file attachment shape. The package keeps the structure compatible
 * with the AI SDK's `FileUIPart` (`type: 'file'`, `url`, `mediaType`,
 * `filename`) but without taking a dependency on the `ai` package.
 */
export interface AttachmentFilePart {
	/** Stable per-session id used as the React key and removal handle. */
	id: string;
	/** Discriminator — always the literal string `'file'`. */
	type: 'file';
	/** Object URL (or data URL after submit conversion) pointing at the file payload. */
	url: string;
	/** MIME type as reported by the browser. Used to pick the preview style. */
	mediaType?: string;
	/** Original file name. */
	filename?: string;
}

/** Attachment controller exposed to prompt input child components. */
export interface AttachmentsContext {
	/** Currently pinned attachments. Ordered by insertion. */
	files: AttachmentFilePart[];
	/** Add one or more files to the attachment list. */
	add: (files: File[] | FileList) => void;
	/** Remove the attachment with the given id. */
	remove: (id: string) => void;
	/** Drop every attachment. */
	clear: () => void;
	/** Open the hidden file picker. */
	openFileDialog: () => void;
	/** Ref to the hidden file input mounted by the form. */
	fileInputRef: RefObject<HTMLInputElement | null>;
}

/** Local attachment context used when no external provider is mounted. */
export const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

/**
 * Read the attachment controller for the current prompt input.
 *
 * @returns The active {@link AttachmentsContext}.
 * @throws If called outside of a `<PromptInputForm />` subtree.
 */
export function usePromptInputAttachments(): AttachmentsContext {
	const context = useContext(LocalAttachmentsContext);
	if (!context) {
		throw new Error(
			'usePromptInputAttachments must be used within a <PromptInputForm />',
		);
	}
	return context;
}
