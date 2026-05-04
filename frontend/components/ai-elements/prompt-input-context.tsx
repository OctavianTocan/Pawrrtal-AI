/**
 * Prompt input context and provider state.
 *
 * @fileoverview Shared controller contexts for prompt input components.
 */

'use client';

import type { FileUIPart } from 'ai';
import { nanoid } from 'nanoid';
import {
	createContext,
	type PropsWithChildren,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

/** Attachment controller exposed to prompt input child components. */
export type AttachmentsContext = {
	files: (FileUIPart & { id: string })[];
	add: (files: File[] | FileList) => void;
	remove: (id: string) => void;
	clear: () => void;
	openFileDialog: () => void;
	fileInputRef: RefObject<HTMLInputElement | null>;
};

/** Controlled textarea value used by provider-backed prompt inputs. */
export type TextInputContext = {
	value: string;
	setInput: (v: string) => void;
	clear: () => void;
};

/** Shared prompt input controller made available by `PromptInputProvider`. */
export type PromptInputControllerProps = {
	textInput: TextInputContext;
	attachments: AttachmentsContext;
	/** INTERNAL: Allows PromptInput to register its file input and opener callback. */
	__registerFileInput: (ref: RefObject<HTMLInputElement | null>, open: () => void) => void;
};

/** Props for the optional global prompt input provider. */
export type PromptInputProviderProps = PropsWithChildren<{
	initialInput?: string;
}>;

export const PromptInputController = createContext<PromptInputControllerProps | null>(null);
export const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null);
export const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

const revokeFileUrl = (file: { url?: string }) => {
	if (file.url) {
		URL.revokeObjectURL(file.url);
	}
};

const createFilePart = (file: File): FileUIPart & { id: string } => ({
	id: nanoid(),
	type: 'file',
	url: URL.createObjectURL(file),
	mediaType: file.type,
	filename: file.name,
});

/** Read the nearest provider-backed prompt input controller. */
export const usePromptInputController = () => {
	const ctx = useContext(PromptInputController);
	if (!ctx) {
		throw new Error(
			'Wrap your component inside <PromptInputProvider> to use usePromptInputController().'
		);
	}
	return ctx;
};

/** Read the provider-backed prompt input controller when one exists. */
export const useOptionalPromptInputController = () => useContext(PromptInputController);

/** Read the provider-level attachment controller. */
export const useProviderAttachments = () => {
	const ctx = useContext(ProviderAttachmentsContext);
	if (!ctx) {
		throw new Error(
			'Wrap your component inside <PromptInputProvider> to use useProviderAttachments().'
		);
	}
	return ctx;
};

/** Read provider-level attachments when the component is wrapped by a provider. */
export const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext);

/** Read the attachment controller for the current prompt input. */
export const usePromptInputAttachments = () => {
	const provider = useOptionalProviderAttachments();
	const local = useContext(LocalAttachmentsContext);
	const context = provider ?? local;
	if (!context) {
		throw new Error(
			'usePromptInputAttachments must be used within a PromptInput or PromptInputProvider'
		);
	}
	return context;
};

/**
 * Optional global provider that lifts PromptInput state outside of PromptInput.
 * If you don't use it, PromptInput stays fully self-managed.
 */
export function PromptInputProvider({
	initialInput: initialTextInput = '',
	children,
}: PromptInputProviderProps) {
	const [textInput, setTextInput] = useState(initialTextInput);
	const clearInput = useCallback(() => setTextInput(''), []);
	const [attachmentFiles, setAttachmentFiles] = useState<(FileUIPart & { id: string })[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const openRef = useRef<() => void>(() => {
		/* opener wired via PromptInputController */
	});

	const add = useCallback((files: File[] | FileList) => {
		const incoming = Array.from(files);
		if (incoming.length === 0) {
			return;
		}

		setAttachmentFiles((prev) => prev.concat(incoming.map(createFilePart)));
	}, []);

	const remove = useCallback((id: string) => {
		setAttachmentFiles((prev) => {
			const found = prev.find((file) => file.id === id);
			if (found) revokeFileUrl(found);
			return prev.filter((file) => file.id !== id);
		});
	}, []);

	const clear = useCallback(() => {
		setAttachmentFiles((prev) => {
			for (const file of prev) revokeFileUrl(file);
			return [];
		});
	}, []);

	const attachmentsRef = useRef(attachmentFiles);
	attachmentsRef.current = attachmentFiles;

	useEffect(() => {
		return () => {
			for (const file of attachmentsRef.current) revokeFileUrl(file);
		};
	}, []);

	const openFileDialog = useCallback(() => {
		openRef.current?.();
	}, []);

	const attachments = useMemo<AttachmentsContext>(
		() => ({
			files: attachmentFiles,
			add,
			remove,
			clear,
			openFileDialog,
			fileInputRef,
		}),
		[attachmentFiles, add, remove, clear, openFileDialog]
	);

	const __registerFileInput = useCallback(
		(ref: RefObject<HTMLInputElement | null>, open: () => void) => {
			fileInputRef.current = ref.current;
			openRef.current = open;
		},
		[]
	);

	const controller = useMemo<PromptInputControllerProps>(
		() => ({
			textInput: {
				value: textInput,
				setInput: setTextInput,
				clear: clearInput,
			},
			attachments,
			__registerFileInput,
		}),
		[textInput, clearInput, attachments, __registerFileInput]
	);

	return (
		<PromptInputController.Provider value={controller}>
			<ProviderAttachmentsContext.Provider value={attachments}>
				{children}
			</ProviderAttachmentsContext.Provider>
		</PromptInputController.Provider>
	);
}
