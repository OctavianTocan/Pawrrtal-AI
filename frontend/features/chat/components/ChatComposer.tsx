'use client';

import { ArrowUpIcon, MicIcon, SquareIcon } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { cn } from '@/lib/utils';
import {
	AttachButton,
	AutoReviewSelector,
	type BrowserSpeechRecognition,
	buildTranscriptContent,
	ComposerTooltip,
	fallbackTranscript,
	getSpeechRecognition,
	PlanButton,
	readSpeechTranscript,
	VoiceMeter,
} from './ChatComposerControls';
import { ConnectAppsStrip } from './ConnectAppsStrip';
import {
	type ChatModelId,
	type ChatReasoningLevel,
	ModelSelectorPopover,
} from './ModelSelectorPopover';

/** Props for the Codex-like chat composer island. */
export type ChatComposerProps = {
	/** The current message being composed by the user. */
	message: PromptInputMessage;
	/** Whether an assistant response is currently streaming. */
	isLoading?: boolean;
	/** Selected chat model ID. */
	selectedModelId: ChatModelId;
	/** Selected reasoning level. */
	selectedReasoning: ChatReasoningLevel;
	/** Additional classes for the root composer form. */
	className?: string;
	/**
	 * When true, renders the dismissible "Connect your apps" strip as an
	 * attached footer band at the bottom of the composer surface. Intended
	 * for the landing/empty-conversation state.
	 */
	showConnectAppsStrip?: boolean;
	/** Callback fired when the textarea content changes. */
	onUpdateMessage: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	/** Callback fired when the user submits the message. */
	onSendMessage: (message: PromptInputMessage) => void;
	/** Callback fired when voice transcription should replace the draft content. */
	onReplaceMessageContent: (content: string) => void;
	/** Callback fired when the selected model changes. */
	onSelectModel: (modelId: ChatModelId) => void;
	/** Callback fired when the selected reasoning level changes. */
	onSelectReasoning: (reasoning: ChatReasoningLevel) => void;
	/** Callback fired when the connect-apps footer band is dismissed. */
	onDismissConnectApps?: () => void;
};

/** localStorage key for the persisted Plan-mode toggle in the composer toolbar. */
const PLAN_MODE_STORAGE_KEY = 'chat-composer:plan-mode-visible';

/** Module-level type guard so the validator reference stays stable across renders. */
function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Persists the Plan-mode toggle across sessions. Defaults to `false` so a fresh
 * chat does not start in Plan mode — the user opts in once and the choice sticks.
 */
function usePlanModeVisible(): readonly [
	boolean,
	(next: boolean | ((prev: boolean) => boolean)) => void,
] {
	return usePersistedState<boolean>({
		storageKey: PLAN_MODE_STORAGE_KEY,
		defaultValue: false,
		validate: isBoolean,
	});
}

const EMPTY_COMPOSER_PLACEHOLDERS = [
	'Ask AI Nexus anything. @ to mention context',
	'Press Cmd+B to toggle the sidebar',
	'Type @ to mention files, folders, or skills',
	'Attach files with +',
	'Use Auto-review to let AI Nexus inspect changes',
] as const;
const DEFAULT_EMPTY_COMPOSER_PLACEHOLDER = 'Ask AI Nexus anything. @ to mention context';
const PLACEHOLDER_ROTATION_INTERVAL_MS = 3200;

function useRotatingPlaceholder(hasContent: boolean): string {
	const [placeholderIndex, setPlaceholderIndex] = useState(0);

	useEffect(() => {
		if (hasContent) {
			setPlaceholderIndex(0);
			return;
		}

		const intervalId = window.setInterval(() => {
			setPlaceholderIndex((index) => (index + 1) % EMPTY_COMPOSER_PLACEHOLDERS.length);
		}, PLACEHOLDER_ROTATION_INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [hasContent]);

	if (hasContent) {
		return DEFAULT_EMPTY_COMPOSER_PLACEHOLDER;
	}

	return EMPTY_COMPOSER_PLACEHOLDERS[placeholderIndex] ?? DEFAULT_EMPTY_COMPOSER_PLACEHOLDER;
}

function AnimatedComposerPlaceholder({
	isVisible,
	text,
}: {
	isVisible: boolean;
	text: string;
}): React.JSX.Element | null {
	if (!isVisible) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute top-3 left-3 z-10 pr-6 text-[14px] leading-6 text-muted-foreground/70"
			aria-hidden="true"
		>
			<span className="composer-placeholder-enter block" key={text}>
				{text}
			</span>
		</div>
	);
}

/**
 * Renders the main chat input island with inline controls and a model selector.
 */
export function ChatComposer({
	message,
	isLoading,
	selectedModelId,
	selectedReasoning,
	className,
	showConnectAppsStrip,
	onUpdateMessage,
	onSendMessage,
	onReplaceMessageContent,
	onSelectModel,
	onSelectReasoning,
	onDismissConnectApps,
}: ChatComposerProps): React.JSX.Element {
	const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [voiceTranscript, setVoiceTranscript] = useState('');
	/** When false, the Plan control is hidden (toggle with Shift+Tab from the composer). */
	const [isPlanTagVisible, setIsPlanTagVisible] = usePlanModeVisible();
	const hasContent = message.content.trim().length > 0;
	const placeholder = useRotatingPlaceholder(hasContent);

	useEffect(() => {
		if (!isRecording) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setRecordingSeconds((seconds) => seconds + 1);
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, [isRecording]);

	useEffect(
		() => () => {
			recognitionRef.current?.abort?.();
		},
		[]
	);

	const startRecording = (): void => {
		const recognition = getSpeechRecognition();
		recognitionRef.current = recognition;
		setVoiceTranscript('');
		setRecordingSeconds(0);
		setIsRecording(true);

		if (!recognition) {
			return;
		}

		recognition.onresult = (event) => {
			setVoiceTranscript(readSpeechTranscript(event));
		};
		recognition.onerror = () => {
			recognitionRef.current = null;
		};
		recognition.onend = () => {
			recognitionRef.current = null;
		};
		recognition.start();
	};

	const finishRecording = ({ shouldSend }: { shouldSend: boolean }): void => {
		const transcript = voiceTranscript.trim() || fallbackTranscript(recordingSeconds);
		const nextContent = buildTranscriptContent({
			currentContent: message.content,
			transcript,
		});

		recognitionRef.current?.stop();
		recognitionRef.current = null;
		setIsRecording(false);
		setVoiceTranscript('');

		if (shouldSend) {
			onSendMessage({ ...message, content: nextContent });
			return;
		}

		onReplaceMessageContent(nextContent);
	};

	const handleStopRecording = (): void => {
		finishRecording({ shouldSend: false });
	};

	const handleSendRecording = (): void => {
		finishRecording({ shouldSend: true });
	};

	const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLFormElement>): void => {
		if (event.key !== 'Tab' || !event.shiftKey) {
			return;
		}
		event.preventDefault();
		setIsPlanTagVisible((visible) => !visible);
	};

	return (
		<PromptInput
			className={cn('w-full max-w-[48.75rem]', className)}
			inputGroupClassName="chat-composer-input-group rounded-[14px] border-transparent bg-foreground-5 shadow-minimal"
			multiple={true}
			onKeyDown={handleComposerKeyDown}
			onSubmit={onSendMessage}
		>
			<PromptInputAttachments className="px-3 pt-2 pb-0">
				{(attachment) => <PromptInputAttachment data={attachment} />}
			</PromptInputAttachments>
			<div className="relative w-full self-stretch">
				<AnimatedComposerPlaceholder isVisible={!hasContent} text={placeholder} />
				<PromptInputTextarea
					aria-label={placeholder}
					className="max-h-48 min-h-14 w-full overflow-y-auto px-3 pt-3 pb-1 text-[14px] leading-6 outline-none placeholder:text-transparent focus-visible:outline-none"
					onChange={onUpdateMessage}
					placeholder=""
					value={message.content}
				/>
			</div>
			<PromptInputFooter className="min-h-9 px-1.5 pb-1.5">
				<div className="flex min-w-0 flex-1 items-center gap-1">
					<AttachButton />
					{isRecording ? (
						<VoiceMeter
							elapsedSeconds={recordingSeconds}
							onSend={handleSendRecording}
							onStop={handleStopRecording}
						/>
					) : (
						<>
							{isPlanTagVisible ? <PlanButton /> : null}
							<AutoReviewSelector />
						</>
					)}
				</div>

				<div
					className={cn(
						'ml-auto flex shrink-0 items-center gap-1',
						isRecording && 'hidden'
					)}
				>
					<ModelSelectorPopover
						selectedModelId={selectedModelId}
						selectedReasoning={selectedReasoning}
						onSelectModel={onSelectModel}
						onSelectReasoning={onSelectReasoning}
					/>
					<ComposerTooltip content="Click to dictate or hold ^M">
						<Button
							aria-label="Start voice input"
							aria-pressed={isRecording}
							className="size-7 rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
							onClick={startRecording}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<MicIcon aria-hidden="true" className="size-3.5" />
						</Button>
					</ComposerTooltip>
					<ComposerTooltip content="Send message">
						<PromptInputSubmit
							className="size-7 cursor-pointer rounded-full bg-foreground text-background hover:bg-foreground/85 disabled:bg-foreground/20 disabled:text-background/60"
							disabled={!hasContent || isLoading}
							status={isLoading ? 'streaming' : 'ready'}
						>
							{isLoading ? (
								<SquareIcon aria-hidden="true" className="size-2.5 fill-current" />
							) : (
								<ArrowUpIcon aria-hidden="true" className="size-3.5" />
							)}
						</PromptInputSubmit>
					</ComposerTooltip>
				</div>
			</PromptInputFooter>
			{showConnectAppsStrip ? <ConnectAppsStrip onDismiss={onDismissConnectApps} /> : null}
		</PromptInput>
	);
}
