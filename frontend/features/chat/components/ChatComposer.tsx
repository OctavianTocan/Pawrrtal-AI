'use client';

import { ArrowUpIcon, MicIcon, SquareIcon } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
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
import { CHAT_STORAGE_KEYS, DEFAULT_PLAN_MODE_VISIBLE } from '../constants';
import { useVoiceTranscribe } from '../hooks/use-voice-transcribe';
import {
	AttachButton,
	AutoReviewSelector,
	buildTranscriptContent,
	ComposerTooltip,
	PlanButton,
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
	/**
	 * Optional fixed placeholder. When set, overrides the rotating landing
	 * placeholder — used for the follow-up composer ("Ask a follow up") so
	 * an active conversation gets a stable label instead of cycling tips
	 * meant for an empty page.
	 */
	placeholderOverride?: string;
};

/** Module-level type guard so the validator reference stays stable across renders. */
function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Persists the Plan-mode toggle across sessions. Defaults match
 * {@link DEFAULT_PLAN_MODE_VISIBLE} (off) so a fresh chat does not start in
 * Plan mode — the user opts in once and the choice sticks.
 */
function usePlanModeVisible(): readonly [
	boolean,
	(next: boolean | ((prev: boolean) => boolean)) => void,
] {
	return usePersistedState<boolean>({
		storageKey: CHAT_STORAGE_KEYS.planModeVisible,
		defaultValue: DEFAULT_PLAN_MODE_VISIBLE,
		validate: isBoolean,
	});
}

const EMPTY_COMPOSER_PLACEHOLDERS = [
	'Ask Pawrrtal anything. @ to mention context',
	'Press Cmd+B to toggle the sidebar',
	'Type @ to mention files, folders, or skills',
	'Attach files with +',
	'Use Auto-review to let Pawrrtal inspect changes',
] as const;
const DEFAULT_EMPTY_COMPOSER_PLACEHOLDER = 'Ask Pawrrtal anything. @ to mention context';
/** Milliseconds between rotating empty-composer placeholder tips. */
const PLACEHOLDER_ROTATION_INTERVAL_MS = 5200;

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
			// `top-2` matches the textarea's `pt-2` so the placeholder sits on
			// the same baseline as the user's first line of text; `top-3` left
			// the placeholder a pixel off when the textarea was tightened.
			className="pointer-events-none absolute top-2 left-3 z-10 pr-6 text-[14px] leading-6 text-muted-foreground/70"
			aria-hidden="true"
		>
			<span className="composer-placeholder-enter block" key={text}>
				{text}
			</span>
		</div>
	);
}

/**
 * Props for the right-side toolbar cluster.
 *
 * Both `selectedModelId` and `selectedReasoning` are derived from
 * {@link ChatComposerProps} so the cluster can never drift away from the
 * model picker's literal-union typing.
 */
interface ComposerSendClusterProps {
	state: ComposerSendClusterState;
	selectedModelId: ChatComposerProps['selectedModelId'];
	selectedReasoning: ChatComposerProps['selectedReasoning'];
	onSelectModel: ChatComposerProps['onSelectModel'];
	onSelectReasoning: ChatComposerProps['onSelectReasoning'];
	onStartRecording: () => void;
}

interface ComposerSendClusterState {
	isRecording: boolean;
	isTranscribing: boolean;
	isLoading: ChatComposerProps['isLoading'];
	hasContent: boolean;
	/** When true, both Plan and Send buttons share a yellow accent. */
	isPlanMode: boolean;
}

/**
 * Right-side toolbar cluster (model picker + mic + submit) extracted out of
 * `ChatComposer` so the parent stays under the project's 120-line function
 * budget. Pure presentation — receives every input as a prop.
 */
function ComposerSendCluster({
	state,
	selectedModelId,
	selectedReasoning,
	onSelectModel,
	onSelectReasoning,
	onStartRecording,
}: ComposerSendClusterProps): React.JSX.Element {
	const { hasContent, isLoading, isPlanMode, isRecording, isTranscribing } = state;
	return (
		<div className={cn('ml-auto flex shrink-0 items-center gap-1', isRecording && 'hidden')}>
			<ModelSelectorPopover
				selectedModelId={selectedModelId}
				selectedReasoning={selectedReasoning}
				onSelectModel={onSelectModel}
				onSelectReasoning={onSelectReasoning}
			/>
			<ComposerTooltip
				content={isTranscribing ? 'Transcribing...' : 'Click to dictate or hold ^M'}
			>
				<Button
					aria-label="Start voice input"
					aria-pressed={isRecording}
					className="size-8 rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground"
					disabled={isTranscribing}
					onClick={onStartRecording}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<MicIcon
						aria-hidden="true"
						className={cn('size-3.5', isTranscribing && 'animate-pulse')}
					/>
				</Button>
			</ComposerTooltip>
			<ComposerTooltip content={isTranscribing ? 'Wait for transcription' : 'Send message'}>
				<PromptInputSubmit
					className={cn(
						'size-8 cursor-pointer rounded-full',
						isPlanMode
							? 'bg-info text-background hover:bg-info/90 disabled:bg-foreground/20 disabled:text-background/60'
							: 'bg-accent text-primary-foreground hover:bg-accent/90 disabled:bg-foreground/20 disabled:text-background/60'
					)}
					disabled={!hasContent || isLoading || isTranscribing}
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
	placeholderOverride,
}: ChatComposerProps): React.JSX.Element {
	const voice = useVoiceTranscribe();
	const isRecording = voice.status === 'recording' || voice.status === 'requesting-permission';
	const isTranscribing = voice.status === 'transcribing';
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	/** When false, the Plan control is hidden (toggle with Shift+Tab from the composer). */
	const [isPlanTagVisible, setIsPlanTagVisible] = usePlanModeVisible();
	const hasContent = message.content.trim().length > 0;
	const rotatingPlaceholder = useRotatingPlaceholder(hasContent);
	// `placeholderOverride` (e.g. "Ask a follow up") wins over the rotating
	// landing tips so an active conversation gets a stable label.
	const placeholder = placeholderOverride ?? rotatingPlaceholder;

	useEffect(() => {
		if (!isRecording) {
			return;
		}

		const intervalId = window.setInterval(() => {
			setRecordingSeconds((seconds) => seconds + 1);
		}, 1000);

		return () => window.clearInterval(intervalId);
	}, [isRecording]);

	const startRecording = (): void => {
		setRecordingSeconds(0);
		void voice.startRecording();
	};

	const finishRecording = async ({ shouldSend }: { shouldSend: boolean }): Promise<void> => {
		const transcript = await voice.stopRecording();
		if (!transcript) {
			return;
		}

		const nextContent = buildTranscriptContent({
			currentContent: message.content,
			transcript,
		});

		if (shouldSend) {
			onSendMessage({ ...message, content: nextContent });
			return;
		}
		onReplaceMessageContent(nextContent);
	};

	const handleStopRecording = (): void => {
		void finishRecording({ shouldSend: false });
	};

	const handleSendRecording = (): void => {
		void finishRecording({ shouldSend: true });
	};

	const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLFormElement>): void => {
		if (event.key !== 'Tab' || !event.shiftKey) {
			return;
		}
		event.preventDefault();
		setIsPlanTagVisible((visible) => !visible);
	};

	return (
		// Stacks the composer above the connect-apps strip via z-index so
		// the strip looks layered behind the chat box (see ConnectAppsStrip).
		<div className={cn('relative flex w-full max-w-[48.75rem] flex-col', className)}>
			<PromptInput
				className="relative z-10 w-full"
				// Composer surface = chat-panel surface (`--background-elevated`)
				// + hairline border, so it reads as a discrete control on the
				// panel without the old gray-cast `bg-foreground-5` wash.
				inputGroupClassName="chat-composer-input-group rounded-surface-lg border border-border/50 bg-[color:var(--background-elevated)] shadow-minimal"
				multiple={true}
				onKeyDown={handleComposerKeyDown}
				onSubmit={onSendMessage}
			>
				<PromptInputAttachments className="px-3 pt-2 pb-0">
					{(attachment) => <PromptInputAttachment data={attachment} />}
				</PromptInputAttachments>
				<div className="relative w-full self-stretch">
					<AnimatedComposerPlaceholder isVisible={!hasContent} text={placeholder} />
					{/* `min-h-11` (44px) + `pt-2` lets a one-line draft sit
				    comfortably without the textarea reading as a tall card on
				    its own. The placeholder absolutely-positioned at `top-3`
				    is shifted to `top-2` to track this in the parent. */}
					<PromptInputTextarea
						aria-label={placeholder}
						className="max-h-48 min-h-11 w-full overflow-y-auto px-3 pt-2 pb-1 text-[14px] leading-6 outline-none placeholder:text-transparent focus-visible:outline-none"
						onChange={onUpdateMessage}
						placeholder=""
						value={message.content}
					/>
				</div>
				{/* `min-h-8` (32px) + `py-1` keeps the controls vertically
			    centered without giving the footer the extra 4px of slack
			    `min-h-9` was reading as. */}
				<PromptInputFooter className="min-h-8 px-1.5 py-1">
					<div className="flex min-w-0 flex-1 items-center gap-1">
						<AttachButton />
						{isRecording || isTranscribing ? (
							<VoiceMeter
								elapsedSeconds={recordingSeconds}
								isTranscribing={isTranscribing}
								meterLevel={voice.meterLevel}
								onSend={handleSendRecording}
								onStop={handleStopRecording}
							/>
						) : (
							<>
								{isPlanTagVisible ? (
									<PlanButton
										isActive={isPlanTagVisible}
										onToggle={() => setIsPlanTagVisible(false)}
									/>
								) : null}
								<AutoReviewSelector />
							</>
						)}
					</div>

					<ComposerSendCluster
						state={{
							hasContent,
							isLoading,
							isPlanMode: isPlanTagVisible,
							isRecording,
							isTranscribing,
						}}
						selectedModelId={selectedModelId}
						selectedReasoning={selectedReasoning}
						onSelectModel={onSelectModel}
						onSelectReasoning={onSelectReasoning}
						onStartRecording={startRecording}
					/>
				</PromptInputFooter>
			</PromptInput>
			{showConnectAppsStrip ? <ConnectAppsStrip onDismiss={onDismissConnectApps} /> : null}
		</div>
	);
}
