/**
 * Prompt input form shell.
 *
 * @fileoverview Owns the form element, the hidden file input, drag-and-drop
 * handling, and the local attachment state. Children read the attachment
 * controller via {@link usePromptInputAttachments}.
 */

'use client';

import {
	type ChangeEventHandler,
	type DragEventHandler,
	type FormEvent,
	type FormEventHandler,
	type HTMLAttributes,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { cn } from '../utils/cn.js';
import {
	type AttachmentFilePart,
	type AttachmentsContext,
	LocalAttachmentsContext,
} from './promptInputContext.js';

/** Message payload emitted when the prompt input form submits. */
export interface PromptInputMessage {
	/** Trimmed text content from the textarea. */
	content: string;
	/** Files pinned to the composer at submit time. */
	files: AttachmentFilePart[];
}

/** Error codes surfaced via the form's optional `onError` callback. */
export type PromptInputFormErrorCode = 'max_files' | 'max_file_size' | 'accept';

/** Error payload passed to `onError` on a rejected drop/pick. */
export interface PromptInputFormError {
	/** Discriminator for the error condition. */
	code: PromptInputFormErrorCode;
	/** Human-readable message; safe to surface in the UI. */
	message: string;
}

/** Props for the root prompt input form. */
export interface PromptInputFormProps
	extends Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> {
	/** Mirrors `<input type="file" accept>` — restricts the file picker / drop. */
	accept?: string;
	/** Allow more than one file at a time. */
	multiple?: boolean;
	/** Additional classes for the inner surface container. */
	inputGroupClassName?: string;
	/** When true, accepts file drops anywhere on the document, not just the form. */
	globalDrop?: boolean;
	/** Reset the hidden file input when the attachment list empties out. */
	syncHiddenInput?: boolean;
	/** Cap on the number of attachments the user can pin at once. */
	maxFiles?: number;
	/** Cap on individual file size in bytes. */
	maxFileSize?: number;
	/** Fired when files are rejected for any reason. */
	onError?: (error: PromptInputFormError) => void;
	/** Fired when the user submits the form (Enter, button click, programmatic). */
	onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
	/** Child composer surfaces (textarea, attachments, footer). */
	children?: ReactNode;
}

let attachmentIdCounter = 0;

/**
 * Generates a stable per-render attachment id without taking a `nanoid`
 * dependency. The counter combined with `Math.random` is enough — the id is
 * scoped to a single composer session and never persisted.
 */
function generateAttachmentId(): string {
	attachmentIdCounter += 1;
	return `att-${attachmentIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns true when the dragged payload contains files (vs. text, links, etc.).
 *
 * @param dataTransfer - The `DataTransfer` from a drag/drop event.
 */
function hasDraggedFiles(dataTransfer: DataTransfer): boolean {
	return dataTransfer.types.includes('Files');
}

/**
 * Returns true when `file` satisfies the comma-separated `accept` filter.
 * An empty/missing filter accepts everything.
 */
function fileMatchesAccept(file: File, accept?: string): boolean {
	if (!accept?.trim()) return true;
	return accept
		.split(',')
		.map((pattern) => pattern.trim())
		.filter(Boolean)
		.some((pattern) => {
			if (pattern.endsWith('/*')) {
				const prefix = pattern.slice(0, -1);
				return file.type.startsWith(prefix);
			}
			return file.type === pattern;
		});
}

/**
 * Wraps a `File` in the package's public attachment shape and creates the
 * object URL the preview UI will read.
 */
function createFilePart(file: File): AttachmentFilePart {
	return {
		id: generateAttachmentId(),
		type: 'file',
		url: URL.createObjectURL(file),
		mediaType: file.type,
		filename: file.name,
	};
}

/** Releases the object URL for a file part. Safe to call multiple times. */
function revokeFileUrl(file: { url?: string }): void {
	if (file.url) URL.revokeObjectURL(file.url);
}

/**
 * Root prompt input form. Wraps its children in a `<form>`, mounts a hidden
 * file input, and exposes the attachment controller via context.
 *
 * @returns The composer form ready to host a textarea + footer.
 */
export function PromptInputForm({
	className,
	accept,
	multiple,
	inputGroupClassName,
	globalDrop,
	syncHiddenInput,
	maxFiles,
	maxFileSize,
	onError,
	onSubmit,
	children,
	onDragOver,
	onDrop,
	...props
}: PromptInputFormProps): React.JSX.Element {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [files, setFiles] = useState<AttachmentFilePart[]>([]);
	const filesRef = useRef(files);
	filesRef.current = files;

	const remove = useCallback((id: string) => {
		setFiles((prev) => {
			const found = prev.find((file) => file.id === id);
			if (found) revokeFileUrl(found);
			return prev.filter((file) => file.id !== id);
		});
	}, []);

	const clear = useCallback(() => {
		setFiles((prev) => {
			for (const file of prev) revokeFileUrl(file);
			return [];
		});
	}, []);

	const add = useCallback(
		(fileList: File[] | FileList) => {
			const incoming = Array.from(fileList);
			const accepted = incoming.filter((file) => fileMatchesAccept(file, accept));
			if (incoming.length && accepted.length === 0) {
				onError?.({ code: 'accept', message: 'No files match the accepted types.' });
				return;
			}
			const sized = accepted.filter((file) =>
				maxFileSize ? file.size <= maxFileSize : true,
			);
			if (accepted.length > 0 && sized.length === 0) {
				onError?.({
					code: 'max_file_size',
					message: 'All files exceed the maximum size.',
				});
				return;
			}
			setFiles((prev) => {
				const capacity =
					typeof maxFiles === 'number' ? Math.max(0, maxFiles - prev.length) : undefined;
				const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized;
				if (typeof capacity === 'number' && sized.length > capacity) {
					onError?.({
						code: 'max_files',
						message: 'Too many files. Some were not added.',
					});
				}
				return prev.concat(capped.map(createFilePart));
			});
		},
		[accept, maxFiles, maxFileSize, onError],
	);

	const openFileDialog = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const contextValue = useMemo<AttachmentsContext>(
		() => ({ files, add, remove, clear, openFileDialog, fileInputRef: inputRef }),
		[files, add, remove, clear, openFileDialog],
	);

	// Clean up object URLs when the form unmounts.
	useEffect(() => {
		return () => {
			for (const file of filesRef.current) revokeFileUrl(file);
		};
	}, []);

	// Reset hidden input value when the attachment list empties.
	useEffect(() => {
		if (syncHiddenInput && inputRef.current && files.length === 0) {
			inputRef.current.value = '';
		}
	}, [files, syncHiddenInput]);

	// Global document drop listener.
	useEffect(() => {
		if (!globalDrop) return;
		const onDocumentDragOver = (e: DragEvent): void => {
			if (e.dataTransfer && hasDraggedFiles(e.dataTransfer)) e.preventDefault();
		};
		const onDocumentDrop = (e: DragEvent): void => {
			if (e.dataTransfer && hasDraggedFiles(e.dataTransfer)) e.preventDefault();
			if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
				add(e.dataTransfer.files);
			}
		};
		document.addEventListener('dragover', onDocumentDragOver);
		document.addEventListener('drop', onDocumentDrop);
		return () => {
			document.removeEventListener('dragover', onDocumentDragOver);
			document.removeEventListener('drop', onDocumentDrop);
		};
	}, [add, globalDrop]);

	const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
		if (event.currentTarget.files) add(event.currentTarget.files);
		event.currentTarget.value = '';
	};

	const handleFormDragOver: DragEventHandler<HTMLFormElement> = (event) => {
		if (!globalDrop && hasDraggedFiles(event.dataTransfer)) event.preventDefault();
	};

	const handleFormDrop: DragEventHandler<HTMLFormElement> = (event) => {
		if (globalDrop) return;
		if (hasDraggedFiles(event.dataTransfer)) event.preventDefault();
		if (event.dataTransfer.files.length > 0) add(event.dataTransfer.files);
	};

	const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const text = (new FormData(form).get('message') as string | null) ?? '';
		form.reset();
		// Snapshot the current attachments before clearing so the consumer
		// receives the list as it was at submit time.
		const snapshot = filesRef.current.slice();
		Promise.resolve(onSubmit({ content: text, files: snapshot }, event))
			.then(() => {
				clear();
			})
			.catch(() => {
				// Keep input and attachments so users can retry after submit errors.
			});
	};

	return (
		<LocalAttachmentsContext.Provider value={contextValue}>
			<input
				accept={accept}
				aria-label="Upload files"
				className="hidden"
				multiple={multiple}
				onChange={handleChange}
				ref={inputRef}
				title="Upload files"
				type="file"
			/>
			<form
				className={cn('w-full', className)}
				onDragOver={(event) => {
					onDragOver?.(event);
					handleFormDragOver(event);
				}}
				onDrop={(event) => {
					onDrop?.(event);
					handleFormDrop(event);
				}}
				onSubmit={handleSubmit}
				{...props}
			>
				<div className={cn('flex flex-col overflow-hidden', inputGroupClassName)}>
					{children}
				</div>
			</form>
		</LocalAttachmentsContext.Provider>
	);
}
