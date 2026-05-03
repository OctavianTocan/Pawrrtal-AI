'use client';

import {
	ArrowUpIcon,
	CheckIcon,
	ChevronDownIcon,
	ListChecksIcon,
	PlusIcon,
	ShieldCheckIcon,
	SlidersHorizontalIcon,
	SquareIcon,
} from 'lucide-react';
import type * as React from 'react';
import { usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const VOICE_METER_BARS = [8, 14, 10, 18, 12, 24, 16, 30, 18, 26, 14, 22, 10, 18, 12, 20];

/** Minimal browser speech-recognition surface used by the composer. */
export type BrowserSpeechRecognition = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start: () => void;
	stop: () => void;
	abort?: () => void;
	onend: ((event: Event) => void) | null;
	onerror: ((event: Event) => void) | null;
	onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
};

type BrowserSpeechRecognitionAlternative = {
	transcript: string;
};

type BrowserSpeechRecognitionResult = {
	readonly length: number;
	readonly isFinal: boolean;
	[index: number]: BrowserSpeechRecognitionAlternative | undefined;
};

type BrowserSpeechRecognitionResultList = {
	readonly length: number;
	[index: number]: BrowserSpeechRecognitionResult | undefined;
};

/** Browser speech-recognition result event shape used by the transcript reader. */
export type BrowserSpeechRecognitionEvent = {
	results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionConstructor = new () => unknown;

type BrowserSpeechWindow = Window & {
	SpeechRecognition?: BrowserSpeechRecognitionConstructor;
	webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

/** Formats an elapsed recording duration as m:ss. */
export function formatRecordingTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/** Appends a voice transcript to any existing draft content. */
export function buildTranscriptContent({
	currentContent,
	transcript,
}: {
	currentContent: string;
	transcript: string;
}): string {
	const trimmedContent = currentContent.trim();
	const trimmedTranscript = transcript.trim();

	if (!trimmedContent) {
		return trimmedTranscript;
	}

	if (!trimmedTranscript) {
		return trimmedContent;
	}

	return `${trimmedContent} ${trimmedTranscript}`;
}

/** Builds fallback text for browsers without speech recognition support. */
export function fallbackTranscript(seconds: number): string {
	return `Voice note recorded for ${formatRecordingTime(seconds)}.`;
}

/** Reads the current speech-recognition transcript from a browser result event. */
export function readSpeechTranscript(event: BrowserSpeechRecognitionEvent): string {
	let nextTranscript = '';

	for (let index = 0; index < event.results.length; index++) {
		nextTranscript += event.results[index]?.[0]?.transcript ?? '';
	}

	return nextTranscript.trim();
}

/** Returns a configured speech-recognition instance when the browser supports it. */
export function getSpeechRecognition(): BrowserSpeechRecognition | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const speechWindow = window as unknown as BrowserSpeechWindow;
	const SpeechRecognitionConstructor =
		speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

	if (!SpeechRecognitionConstructor) {
		return null;
	}

	const recognition = new SpeechRecognitionConstructor() as BrowserSpeechRecognition;
	recognition.continuous = true;
	recognition.interimResults = true;
	recognition.lang = 'en-US';
	return recognition;
}

/** Shared tooltip wrapper for compact composer controls. */
export function ComposerTooltip({
	children,
	content,
}: {
	children: React.ReactNode;
	content: string;
}): React.JSX.Element {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex">{children}</span>
			</TooltipTrigger>
			<TooltipContent side="top">{content}</TooltipContent>
		</Tooltip>
	);
}

/** Renders the file attachment trigger bound to the prompt input controller. */
export function AttachButton(): React.JSX.Element {
	const attachments = usePromptInputAttachments();

	return (
		<ComposerTooltip content="Attach files">
			<Button
				aria-label="Attach files"
				className="size-7 rounded-[7px] text-muted-foreground hover:text-foreground"
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

/** Renders the compact plan-mode trigger used in the composer toolbar. */
export function PlanButton(): React.JSX.Element {
	return (
		<ComposerTooltip content="Create a plan">
			<Button
				className="h-7 gap-1 rounded-[7px] px-1.5 text-[12px] font-normal text-muted-foreground hover:text-foreground"
				type="button"
				variant="ghost"
			>
				<ListChecksIcon aria-hidden="true" className="size-3.5" />
				Plan
			</Button>
		</ComposerTooltip>
	);
}

/** Renders the auto-review permissions selector in the composer toolbar. */
export function AutoReviewSelector(): React.JSX.Element {
	return (
		<TooltipProvider disableHoverableContent>
			<Tooltip delayDuration={300}>
				<DropdownMenu>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<Button
								className="h-7 gap-1 rounded-[7px] bg-transparent px-1.5 text-[12px] font-normal text-accent hover:bg-foreground/[0.04] hover:text-accent aria-expanded:bg-foreground/[0.04] data-[state=open]:bg-foreground/[0.04]"
								type="button"
								variant="ghost"
							>
								<ShieldCheckIcon aria-hidden="true" className="size-3.5" />
								Auto-review
								<ChevronDownIcon aria-hidden="true" className="size-3" />
							</Button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<DropdownMenuContent
						align="start"
						className="min-w-52"
						side="top"
						sideOffset={8}
					>
						<DropdownMenuItem>
							<span className="flex size-4 items-center justify-center">
								<SlidersHorizontalIcon aria-hidden="true" className="size-3.5" />
							</span>
							Default permissions
						</DropdownMenuItem>
						<DropdownMenuItem className="justify-between">
							<span className="flex items-center gap-2">
								<ShieldCheckIcon aria-hidden="true" className="size-3.5" />
								Auto-review
							</span>
							<CheckIcon aria-hidden="true" className="size-3.5 text-foreground" />
						</DropdownMenuItem>
						<DropdownMenuItem>
							<span className="flex size-4 items-center justify-center">
								<ShieldCheckIcon aria-hidden="true" className="size-3.5" />
							</span>
							Full access
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<span className="flex size-4 items-center justify-center">
								<SlidersHorizontalIcon aria-hidden="true" className="size-3.5" />
							</span>
							Custom (config.toml)
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<TooltipContent side="top">
					<span className="block">Review code changes automatically</span>
					<span className="block text-muted-foreground">Shift + Tab to toggle</span>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/** Renders live voice recording controls and the animated voice meter. */
export function VoiceMeter({
	elapsedSeconds,
	onSend,
	onStop,
}: {
	elapsedSeconds: number;
	onSend: () => void;
	onStop: () => void;
}): React.JSX.Element {
	return (
		<div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
			<div className="flex min-w-0 flex-1 items-center">
				<div className="h-px min-w-8 flex-1 border-muted-foreground/30 border-t border-dashed" />
				<div className="flex h-7 shrink-0 items-center gap-[2px] px-2">
					{VOICE_METER_BARS.map((height, index) => (
						<span
							aria-hidden="true"
							className="w-[2px] rounded-full bg-foreground/75"
							key={`${height}-${index}`}
							style={{
								height,
								opacity: index % 3 === 0 ? 0.55 : 0.9,
								animation: `pulse 1.1s ease-in-out ${index * 70}ms infinite`,
							}}
						/>
					))}
				</div>
			</div>
			<span className="w-9 text-right text-[12px] text-muted-foreground tabular-nums">
				{formatRecordingTime(elapsedSeconds)}
			</span>
			<ComposerTooltip content="Stop and transcribe">
				<Button
					aria-label="Stop and transcribe"
					className="size-8 rounded-full bg-foreground-10 text-foreground hover:bg-foreground-15"
					onClick={onStop}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<SquareIcon aria-hidden="true" className="size-3 fill-current" />
				</Button>
			</ComposerTooltip>
			<ComposerTooltip content="Transcribe and send">
				<Button
					aria-label="Transcribe and send"
					className="size-8 rounded-full bg-foreground text-background hover:bg-foreground/85"
					onClick={onSend}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<ArrowUpIcon aria-hidden="true" className="size-4" />
				</Button>
			</ComposerTooltip>
		</div>
	);
}
