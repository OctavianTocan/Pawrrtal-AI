/**
 * Pure presentational shell for the chat composer.
 *
 * @fileoverview Receives every value via props — no hooks, no contexts beyond
 * what the prompt-input form internally provides. The container
 * (`ChatComposer.tsx`) owns voice recording, persisted Plan-mode visibility,
 * the rotating placeholder, and every handler.
 */

'use client';

import { ArrowUpIcon, MicIcon, SquareIcon } from 'lucide-react';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { ModelSelectorPopover } from '../model-selector/ModelSelectorPopover';
import { TooltipProvider } from '../ui/Tooltip';
import {
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputFooter,
	PromptInputForm,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
} from '../prompt-input/index';
import type {
	ChatModelOption,
	ChatReasoningLevel,
} from '../types/index';
import { Button } from '../ui/Button';
import { cn } from '../utils/cn';
import { AttachButton } from './controls/AttachButton';
import { ComposerTooltip } from './controls/ComposerTooltip';
import { VoiceMeter } from './controls/VoiceMeter';

/**
 * Props for the pure presentational shell of the chat composer.
 *
 * Every value here is a primitive, callback, or controlled value — there is
 * no hook usage in the view. The container owns lifecycle and derives every
 * prop.
 */
export interface ChatComposerViewProps {
	/** Resolved textarea value. */
	value: string;
	/** Whether an assistant response is currently streaming. */
	isLoading?: boolean;
	/** Consumer-supplied model list. When omitted, the model picker hides. */
	models?: ChatModelOption[];
	/** Currently selected model identifier. */
	selectedModelId?: string;
	/** Fired when the user picks a model. */
	onSelectModel?: (modelId: string) => void;
	/** Consumer-supplied reasoning levels. */
	reasoningLevels?: ChatReasoningLevel[];
	/** Currently selected reasoning level. */
	selectedReasoning?: string;
	/** Fired when the user picks a reasoning level. */
	onSelectReasoning?: (level: ChatReasoningLevel) => void;
	/** Extra classes for the root composer column. */
	className?: string;
	/** Resolved placeholder string. */
	placeholder: string;
	/** ARIA label for the textarea. */
	ariaLabel?: string;
	/** Slot rendered between the AttachButton and the right-side cluster. */
	footerActions?: ReactNode;

	// Container-owned text wiring.
	/** Fired on every keystroke. */
	onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
	/** Fired when the form submits — already debounced through the prompt-input form. */
	onSubmit: (message: PromptInputMessage) => void | Promise<void>;

	// Voice flow — when `isVoiceSupported` is false the mic button is hidden.
	/** True when an `onTranscribeAudio` callback is wired up. */
	isVoiceSupported: boolean;
	/** True while the recorder is requesting permission or actively capturing. */
	isRecording: boolean;
	/** True while the captured audio is being transcribed. */
	isTranscribing: boolean;
	/** Elapsed recording time in whole seconds. */
	recordingSeconds: number;
	/** Fired when the user clicks the mic to start recording. */
	onStartRecording: () => void;
	/** Stop recording without submitting — drops the transcript into the draft. */
	onStopRecording: () => void;
	/** Stop recording and submit in one action. */
	onSendRecording: () => void;

	// Composer-level keyboard handler (Shift+Tab toggles, escape, etc.).
	/** Fired on every keydown bubbling out of the form. */
	onComposerKeyDown?: (event: KeyboardEvent<HTMLFormElement>) => void;
}

/**
 * Animated empty-state placeholder rendered inside the textarea.
 *
 * Lives in the View because it's pure presentation: it renders a string and
 * fades it in. The animation class (`composer-placeholder-enter`) is defined
 * in `src/styles/animations.css`.
 */
function AnimatedComposerPlaceholder({
	isVisible,
	text,
}: {
	isVisible: boolean;
	text: string;
}): React.JSX.Element | null {
	if (!isVisible) return null;
	return (
		<div
			className="pointer-events-none absolute top-2 left-3 z-10 pr-6 text-[14px] leading-6 text-[color:color-mix(in_oklch,var(--color-chat-muted)_70%,transparent)]"
			aria-hidden="true"
		>
			<span className="composer-placeholder-enter block" key={text}>
				{text}
			</span>
		</div>
	);
}

/**
 * Right-side toolbar cluster: model picker + mic + submit. Pure presentation.
 */
function ComposerSendCluster({
	isRecording,
	isTranscribing,
	isLoading,
	hasContent,
	isVoiceSupported,
	models,
	selectedModelId,
	onSelectModel,
	reasoningLevels,
	selectedReasoning,
	onSelectReasoning,
	onStartRecording,
}: {
	isRecording: boolean;
	isTranscribing: boolean;
	isLoading?: boolean;
	hasContent: boolean;
	isVoiceSupported: boolean;
	models?: ChatModelOption[];
	selectedModelId?: string;
	onSelectModel?: (modelId: string) => void;
	reasoningLevels?: ChatReasoningLevel[];
	selectedReasoning?: string;
	onSelectReasoning?: (level: ChatReasoningLevel) => void;
	onStartRecording: () => void;
}): React.JSX.Element {
	const showModelPicker =
		(models && models.length > 0) || (reasoningLevels && reasoningLevels.length > 0);
	return (
		<div className={cn('ml-auto flex shrink-0 items-center gap-1', isRecording && 'hidden')}>
			{showModelPicker ? (
				<ModelSelectorPopover
					models={models}
					selectedModelId={selectedModelId}
					onSelectModel={onSelectModel}
					reasoningLevels={reasoningLevels}
					selectedReasoning={selectedReasoning}
					onSelectReasoning={onSelectReasoning}
				/>
			) : null}
			{isVoiceSupported ? (
				<ComposerTooltip
					content={isTranscribing ? 'Transcribing…' : 'Click to dictate or hold ^M'}
				>
					<Button
						aria-label="Start voice input"
						aria-pressed={isRecording}
						className="size-8 rounded-full text-[var(--color-chat-muted)] hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_8%,transparent)] hover:text-[var(--color-chat-foreground)]"
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
			) : null}
			<ComposerTooltip content={isTranscribing ? 'Wait for transcription' : 'Send message'}>
				<PromptInputSubmit
					className="size-8 rounded-full bg-[var(--color-chat-accent)] text-[var(--color-chat-accent-foreground)] hover:opacity-90 disabled:opacity-50"
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
 * Pure presentational shell for the chat composer.
 *
 * @returns The chat composer surface ready to drop into a chat column.
 */
export function ChatComposerView({
	value,
	isLoading,
	models,
	selectedModelId,
	onSelectModel,
	reasoningLevels,
	selectedReasoning,
	onSelectReasoning,
	className,
	placeholder,
	ariaLabel,
	footerActions,
	onTextChange,
	onSubmit,
	isVoiceSupported,
	isRecording,
	isTranscribing,
	recordingSeconds,
	onStartRecording,
	onStopRecording,
	onSendRecording,
	onComposerKeyDown,
}: ChatComposerViewProps): React.JSX.Element {
	const hasContent = value.trim().length > 0;
	return (
		// Self-provide the Radix Tooltip context so consumers do not need to wrap
		// the composer in their own TooltipProvider.
		<TooltipProvider disableHoverableContent>
				<div className={cn('relative flex w-full max-w-[48.75rem] flex-col', className)}>
				<PromptInputForm
					className="relative z-10 w-full"
					inputGroupClassName="rounded-[var(--radius-chat-lg)] border border-[color:color-mix(in_oklch,var(--color-chat-border)_50%,transparent)] bg-[var(--color-chat-bg-elevated)] shadow-[var(--shadow-chat-minimal)]"
					multiple
					onKeyDown={onComposerKeyDown}
					onSubmit={onSubmit}
				>
					<PromptInputAttachments className="px-3 pt-2 pb-0">
						{(attachment) => <PromptInputAttachment data={attachment} />}
					</PromptInputAttachments>
					<div className="relative w-full self-stretch">
						<AnimatedComposerPlaceholder isVisible={!hasContent} text={placeholder} />
						<PromptInputTextarea
							aria-label={ariaLabel ?? placeholder}
							className="max-h-48 min-h-11 w-full overflow-y-auto px-3 pt-2 pb-1 text-[14px] leading-6 outline-none placeholder:text-transparent focus-visible:outline-none"
							onChange={onTextChange}
							placeholder=""
							value={value}
						/>
					</div>
					<PromptInputFooter className="min-h-8 px-1.5 py-1">
						<div className="flex min-w-0 flex-1 items-center gap-1">
							<AttachButton />
							{isRecording || isTranscribing ? (
								<VoiceMeter
									elapsedSeconds={recordingSeconds}
									isTranscribing={isTranscribing}
									onSend={onSendRecording}
									onStop={onStopRecording}
								/>
							) : (
								footerActions ?? null
							)}
						</div>
						<ComposerSendCluster
							isRecording={isRecording}
							isTranscribing={isTranscribing}
							isLoading={isLoading}
							hasContent={hasContent}
							isVoiceSupported={isVoiceSupported}
							models={models}
							selectedModelId={selectedModelId}
							onSelectModel={onSelectModel}
							reasoningLevels={reasoningLevels}
							selectedReasoning={selectedReasoning}
							onSelectReasoning={onSelectReasoning}
							onStartRecording={onStartRecording}
						/>
					</PromptInputFooter>
				</PromptInputForm>
			</div>
		</TooltipProvider>
	);
}
