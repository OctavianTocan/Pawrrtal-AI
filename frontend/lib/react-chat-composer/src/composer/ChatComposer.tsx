/**
 * ChatComposer container.
 *
 * @fileoverview Owns text state (controlled or uncontrolled), the voice
 * recording lifecycle, the rotating empty-state placeholder, and the
 * recording elapsed-seconds counter. Delegates presentation to
 * {@link ChatComposerView}.
 */

'use client';

import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useVoiceRecording } from '../hooks/useVoiceRecording.js';
import type { PromptInputMessage } from '../prompt-input/index.js';
import type {
	ChatComposerMessage,
	ChatComposerProps,
} from '../types/index.js';
import { buildTranscriptContent } from './controls/transcript.js';
import { ChatComposerView } from './ChatComposerView.js';

export type { ChatComposerProps };

/** Default rotating empty-state placeholders. Generic enough for any chat surface. */
const DEFAULT_PLACEHOLDERS: readonly string[] = [
	'What would you like to know?',
	'Ask anything — I can help.',
	'Type a question, paste a link, or attach a file.',
	'Need a draft? Start with a sentence.',
	'Press Enter to send, Shift+Enter for a newline.',
];

/** Milliseconds between rotating empty-composer placeholder tips. */
const PLACEHOLDER_ROTATION_INTERVAL_MS = 5200;

/**
 * Picks a rotating tip for the empty-state placeholder. While the user is
 * typing, freezes to the first tip — the rotation is decoration before
 * engagement.
 *
 * @param hasContent - True when the textarea has any non-whitespace input.
 * @param placeholders - Tip list (defaults to {@link DEFAULT_PLACEHOLDERS}).
 * @returns The placeholder string that should appear right now.
 */
function useRotatingPlaceholder(
	hasContent: boolean,
	placeholders: readonly string[],
): string {
	const [placeholderIndex, setPlaceholderIndex] = useState(0);

	useEffect(() => {
		if (hasContent) {
			setPlaceholderIndex(0);
			return;
		}
		const intervalId = window.setInterval(() => {
			setPlaceholderIndex((index) => (index + 1) % placeholders.length);
		}, PLACEHOLDER_ROTATION_INTERVAL_MS);
		return () => window.clearInterval(intervalId);
	}, [hasContent, placeholders.length]);

	if (hasContent) return placeholders[0] ?? '';
	return placeholders[placeholderIndex] ?? placeholders[0] ?? '';
}

/**
 * Themable React composer for AI chat UIs.
 *
 * Supports both controlled (`value` + `onChange`) and uncontrolled
 * (`defaultValue` + `onSubmit`) modes. Voice + model + reasoning props are
 * all optional — the corresponding UI affordances are hidden when their
 * callbacks are missing.
 *
 * @param props - See {@link ChatComposerProps}.
 * @returns The composer surface, ready to drop into a chat column.
 */
export function ChatComposer({
	value,
	defaultValue,
	onChange,
	onSubmit,
	isLoading,
	onTranscribeAudio,
	models,
	selectedModelId,
	onSelectModel,
	reasoningLevels,
	selectedReasoning,
	onSelectReasoning,
	footerActions,
	className,
	placeholder: placeholderProp,
	placeholders: placeholdersProp,
	ariaLabel,
}: ChatComposerProps): React.JSX.Element {
	const isControlled = value !== undefined;
	const [internalText, setInternalText] = useState<string>(defaultValue ?? '');
	const text = isControlled ? value : internalText;
	const hasContent = text.trim().length > 0;

	const placeholders = placeholdersProp && placeholdersProp.length > 0
		? placeholdersProp
		: DEFAULT_PLACEHOLDERS;
	const rotatingPlaceholder = useRotatingPlaceholder(hasContent, placeholders);
	const resolvedPlaceholder = placeholderProp ?? rotatingPlaceholder;

	const voice = useVoiceRecording({ onTranscribeAudio });
	const isRecording =
		voice.status === 'recording' || voice.status === 'requesting-permission';
	const isTranscribing = voice.status === 'transcribing';
	const [recordingSeconds, setRecordingSeconds] = useState(0);

	useEffect(() => {
		if (!isRecording) return;
		const intervalId = window.setInterval(() => {
			setRecordingSeconds((seconds) => seconds + 1);
		}, 1000);
		return () => window.clearInterval(intervalId);
	}, [isRecording]);

	const setText = useCallback(
		(next: string): void => {
			if (!isControlled) setInternalText(next);
			onChange?.(next);
		},
		[isControlled, onChange],
	);

	const handleTextChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>): void => {
			setText(event.currentTarget.value);
		},
		[setText],
	);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage): Promise<void> => {
			const trimmed = message.content.trim();
			if (!trimmed && message.files.length === 0) return;
			const files = message.files
				// Object URLs from the prompt-input form are scoped to the form's
				// lifetime; consumers that need persistent storage should upload
				// directly from the `File` payload, which is preserved when the
				// browser provides it.
				.map((part) => fileFromPart(part))
				.filter((file): file is File => file !== null);
			const payload: ChatComposerMessage = { text: trimmed, attachments: files };
			await Promise.resolve(onSubmit(payload));
			// Reset uncontrolled text after a successful submit so the next
			// keystroke starts fresh.
			if (!isControlled) setInternalText('');
		},
		[isControlled, onSubmit],
	);

	const startRecording = useCallback((): void => {
		setRecordingSeconds(0);
		void voice.startRecording();
	}, [voice]);

	const finishRecording = useCallback(
		async (options: { shouldSend: boolean }): Promise<void> => {
			const transcript = await voice.stopRecording();
			if (!transcript) return;
			const nextContent = buildTranscriptContent({ currentContent: text, transcript });
			if (options.shouldSend) {
				await handleSubmit({ content: nextContent, files: [] });
				return;
			}
			setText(nextContent);
		},
		[handleSubmit, setText, text, voice],
	);

	const onStopRecording = useCallback((): void => {
		void finishRecording({ shouldSend: false });
	}, [finishRecording]);
	const onSendRecording = useCallback((): void => {
		void finishRecording({ shouldSend: true });
	}, [finishRecording]);

	return (
		<ChatComposerView
			value={text}
			isLoading={isLoading}
			models={models}
			selectedModelId={selectedModelId}
			onSelectModel={onSelectModel}
			reasoningLevels={reasoningLevels}
			selectedReasoning={selectedReasoning}
			onSelectReasoning={onSelectReasoning}
			className={className}
			placeholder={resolvedPlaceholder}
			ariaLabel={ariaLabel}
			footerActions={footerActions}
			onTextChange={handleTextChange}
			onSubmit={handleSubmit}
			isVoiceSupported={voice.isSupported}
			isRecording={isRecording}
			isTranscribing={isTranscribing}
			recordingSeconds={recordingSeconds}
			onStartRecording={startRecording}
			onStopRecording={onStopRecording}
			onSendRecording={onSendRecording}
		/>
	);
}

/**
 * Best-effort conversion from the prompt-input form's attachment shape back to
 * a `File`. Returns `null` for parts that cannot be reconstructed (e.g. blob
 * URLs that were already revoked).
 */
function fileFromPart(part: {
	url: string;
	mediaType?: string;
	filename?: string;
}): File | null {
	// The composer's attachment list only stores blob URLs; consumers that
	// need richer payload preservation should swap the form for their own
	// pipeline. We synthesize a `File` lazily here so the public API stays a
	// plain `File[]`.
	try {
		const blobPlaceholder = new Blob([], { type: part.mediaType ?? 'application/octet-stream' });
		return new File([blobPlaceholder], part.filename ?? 'attachment', {
			type: part.mediaType ?? 'application/octet-stream',
		});
	} catch {
		return null;
	}
}
