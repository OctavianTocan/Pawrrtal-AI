'use client';

import { DropdownMenu } from '@octavian-tocan/react-dropdown';
import {
	AlertTriangleIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronDownIcon,
	HandIcon,
	ListChecksIcon,
	Loader2,
	MapIcon,
	PlusIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	SlidersHorizontalIcon,
	SquareIcon,
} from 'lucide-react';
import type * as React from 'react';
import { useEffect } from 'react';
import { usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useTooltipDropdown } from '@/hooks/use-tooltip-dropdown';
import { cn } from '@/lib/utils';
import {
	CHAT_STORAGE_KEYS,
	DEFAULT_PERMISSION_MODE,
	PERMISSION_MODE_ADVANCED,
	PERMISSION_MODE_CYCLE,
	PERMISSION_MODE_DISABLED,
	PERMISSION_MODE_ORDER,
	PERMISSION_MODES,
	type PermissionMode,
} from '../constants';

/**
 * Bar heights (px) used by the scrolling waveform timeline. The pattern
 * is intentionally jagged so the rendered timeline reads as "live audio"
 * rather than a synthesizer-style equalizer; the array is doubled and
 * scrolled with a CSS animation to give the illusion of continuous flow.
 */
const WAVEFORM_BARS = [
	6, 10, 8, 14, 22, 18, 12, 28, 20, 14, 8, 18, 24, 16, 10, 6, 12, 20, 28, 22, 14, 10, 16, 24, 18,
	12, 8, 14, 20, 26, 18, 12, 8, 16, 22, 28, 20, 14, 10, 6,
] as const;

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
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className="h-7 gap-1 rounded-[7px] px-1.5 text-[12px] font-normal text-muted-foreground hover:text-foreground"
					type="button"
					variant="ghost"
				>
					<ListChecksIcon aria-hidden="true" className="size-3.5" />
					Plan
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<span className="block">Create a plan</span>
				<span className="block text-muted-foreground">Shift+Tab to show or hide</span>
			</TooltipContent>
		</Tooltip>
	);
}

interface PermissionModeMeta {
	/** Human-readable label shown in the dropdown and trigger. */
	label: string;
	/** Lucide icon used as the leading affordance for this mode. */
	Icon: typeof ShieldCheckIcon;
	/** Tailwind text color token applied to the trigger + icon for this mode. */
	colorClass: string;
	/** Tailwind background tint applied behind the icon for this mode. */
	bgClass: string;
	/** Optional secondary line shown under the label in the dropdown. */
	hint?: string;
}

/**
 * Static metadata for each permission mode.  Indexed by {@link PermissionMode}
 * so adding a new mode forces a TypeScript error until both the union and
 * metadata are updated.
 *
 * Lives next to the renderer (not in `constants.ts`) because the Lucide
 * icon components are React render concerns, not data; keeping them here
 * means the shared constants module stays free of UI imports.
 */
const PERMISSION_MODE_META: Record<PermissionMode, PermissionModeMeta> = {
	plan: {
		label: 'Plan',
		Icon: MapIcon,
		colorClass: 'text-info',
		bgClass: 'bg-info/15',
		hint: 'Read-only — survey and draft a plan, no changes.',
	},
	'ask-to-edit': {
		label: 'Ask to Edit',
		Icon: HandIcon,
		colorClass: 'text-info',
		bgClass: 'bg-info/15',
		hint: 'Read freely; writes blocked.',
	},
	'auto-review': {
		label: 'Auto-review',
		Icon: ShieldCheckIcon,
		colorClass: 'text-warning',
		bgClass: 'bg-warning/15',
		hint: 'Coming soon — disabled for now.',
	},
	'full-access': {
		label: 'Full access',
		Icon: ShieldAlertIcon,
		colorClass: 'text-destructive',
		bgClass: 'bg-destructive/15',
		hint: 'Agent can read, write, and execute without prompts.',
	},
	custom: {
		label: 'Custom',
		Icon: SlidersHorizontalIcon,
		colorClass: 'text-muted-foreground',
		bgClass: 'bg-foreground/10',
		hint: 'Coming soon — disabled for now.',
	},
};

/** Runtime guard so older persisted strings don't crash the selector. */
function isPermissionMode(value: unknown): value is PermissionMode {
	return typeof value === 'string' && (PERMISSION_MODES as readonly string[]).includes(value);
}

/** Cycle to the next non-disabled mode (used by Shift+Tab). */
function nextPermissionMode(current: PermissionMode): PermissionMode {
	const cycle = PERMISSION_MODE_CYCLE;
	const idx = cycle.indexOf(current);
	// If the current mode is disabled (shouldn't happen but be safe), step
	// to the first cycle entry rather than wrapping past -1 to the last.
	const safeIdx = idx === -1 ? 0 : idx;
	const nextItem = cycle[(safeIdx + 1) % cycle.length];
	return nextItem ?? current;
}

/**
 * Permission mode selector for the chat composer toolbar.
 *
 * Disabled modes (auto-review, custom) render greyed-out with a "coming
 * soon" hint — selecting them is a no-op and the active mode stays put.
 *
 * Shift+Tab cycles forward through the enabled modes; the keypress is
 * captured at the document level so users don't have to focus the
 * trigger first.  Plan mode participates in the cycle just like the
 * others — Tavi's design doc treats it as a permission mode that also
 * adds a planning system-prompt addendum.
 */
export function AutoReviewSelector(): React.JSX.Element {
	const [permissionMode, setPermissionMode] = usePersistedState<PermissionMode>({
		storageKey: CHAT_STORAGE_KEYS.permissionMode,
		defaultValue: DEFAULT_PERMISSION_MODE,
		validate: isPermissionMode,
	});
	// Same hook ModelSelectorPopover uses — keeps the tooltip suppressed during
	// the dropdown's closing window so a focus-return on the trigger doesn't
	// fire `Tooltip.onOpenChange(true)` with `data-state="instant-open"` while
	// the dropdown is still mid-fade.
	const { menuOpen, tooltipOpen, handleMenuOpenChange, handleTooltipOpenChange } =
		useTooltipDropdown();

	// Shift+Tab cycle — global keydown so the user doesn't have to focus
	// the selector first.  Bail out when an editable surface is active so
	// we don't steal the keystroke from a textarea or contenteditable.
	useEffect(() => {
		const handler = (event: KeyboardEvent): void => {
			if (event.key !== 'Tab' || !event.shiftKey) return;
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName?.toLowerCase();
			if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
				return;
			}
			event.preventDefault();
			setPermissionMode((current) => nextPermissionMode(current));
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [setPermissionMode]);

	const activeMeta = PERMISSION_MODE_META[permissionMode];
	const ActiveIcon = activeMeta.Icon;

	return (
		<TooltipProvider disableHoverableContent>
			<Tooltip onOpenChange={handleTooltipOpenChange} open={tooltipOpen}>
				<TooltipTrigger asChild>
					<span className="inline-flex">
						<DropdownMenu
							align="start"
							closeOnSelect
							usePortal
							contentClassName="chat-composer-dropdown-menu popover-styled p-1 min-w-[224px]"
							getItemDisplay={(mode) => PERMISSION_MODE_META[mode].label}
							getItemKey={(mode) => mode}
							getItemSeparator={(mode) => PERMISSION_MODE_ADVANCED.has(mode)}
							items={PERMISSION_MODE_ORDER}
							onOpenChange={handleMenuOpenChange}
							onSelect={(mode) => {
								// Disabled modes are visible but non-selectable — keep the
								// active mode put if the user clicks one.
								if (PERMISSION_MODE_DISABLED.has(mode)) return;
								setPermissionMode(mode);
							}}
							placement="top"
							renderItem={(mode, _isSelected, onSelect) => (
								<PermissionModeMenuItem
									isSelected={mode === permissionMode}
									mode={mode}
									onSelect={onSelect}
								/>
							)}
							trigger={
								<Button
									className={cn(
										'h-7 gap-1 rounded-[7px] bg-transparent px-1.5 text-[12px] font-normal hover:bg-foreground/[0.04]',
										menuOpen && 'bg-foreground/[0.04]',
										activeMeta.colorClass
									)}
									type="button"
									variant="ghost"
								>
									<ActiveIcon aria-hidden="true" className="size-3.5" />
									{activeMeta.label}
									<ChevronDownIcon aria-hidden="true" className="size-3" />
								</Button>
							}
						/>
					</span>
				</TooltipTrigger>
				<TooltipContent side="top">
					<span className="block">Tool permissions</span>
					<span className="block text-muted-foreground">Shift+Tab to cycle</span>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

interface PermissionModeMenuItemProps {
	mode: PermissionMode;
	isSelected: boolean;
	onSelect: (mode: PermissionMode) => void;
}

/**
 * Single dropdown row for a permission mode.  Disabled modes render
 * greyed-out with a leading warning glyph so the user knows why they
 * can't pick it.
 */
function PermissionModeMenuItem({
	mode,
	isSelected,
	onSelect,
}: PermissionModeMenuItemProps): React.JSX.Element {
	const { label, Icon, colorClass, bgClass, hint } = PERMISSION_MODE_META[mode];
	const disabled = PERMISSION_MODE_DISABLED.has(mode);

	return (
		<button
			aria-disabled={disabled || undefined}
			className={cn(
				'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm',
				disabled
					? 'cursor-not-allowed text-muted-foreground/70'
					: 'cursor-pointer hover:bg-foreground/[0.04]'
			)}
			onClick={() => {
				if (!disabled) onSelect(mode);
			}}
			type="button"
		>
			<span className="flex min-w-0 items-center gap-2">
				<span
					aria-hidden="true"
					className={cn(
						'inline-flex size-5 shrink-0 items-center justify-center rounded-[5px]',
						bgClass,
						disabled ? 'opacity-50' : '',
						colorClass
					)}
				>
					<Icon className="size-3" />
				</span>
				<span className="flex min-w-0 flex-col text-left">
					<span className="truncate">{label}</span>
					{hint ? (
						<span className="truncate text-[11px] text-muted-foreground">{hint}</span>
					) : null}
				</span>
			</span>
			{disabled ? (
				<AlertTriangleIcon
					aria-hidden="true"
					className="size-3.5 shrink-0 text-muted-foreground"
				/>
			) : isSelected ? (
				<CheckIcon aria-hidden="true" className="size-3.5 text-foreground" />
			) : null}
		</button>
	);
}

/** Renders live voice recording controls and the animated voice meter. */
export function VoiceMeter({
	elapsedSeconds,
	isTranscribing,
	onSend,
	onStop,
}: {
	elapsedSeconds: number;
	/** When true, swap the stop button for a loader and disable Send. */
	isTranscribing?: boolean;
	onSend: () => void;
	onStop: () => void;
}): React.JSX.Element {
	return (
		<div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
			<WaveformTimeline isPaused={Boolean(isTranscribing)} />
			<span className="w-9 text-right text-[12px] text-muted-foreground tabular-nums">
				{formatRecordingTime(elapsedSeconds)}
			</span>
			<ComposerTooltip content={isTranscribing ? 'Transcribing…' : 'Stop and transcribe'}>
				<Button
					aria-label={isTranscribing ? 'Transcribing' : 'Stop and transcribe'}
					className="size-8 rounded-full bg-foreground-10 text-foreground hover:bg-foreground-15 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isTranscribing}
					onClick={onStop}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					{isTranscribing ? (
						<Loader2 aria-hidden="true" className="size-4 animate-spin" />
					) : (
						<SquareIcon aria-hidden="true" className="size-3 fill-current" />
					)}
				</Button>
			</ComposerTooltip>
			<ComposerTooltip
				content={isTranscribing ? 'Wait for transcription' : 'Transcribe and send'}
			>
				<Button
					aria-label="Transcribe and send"
					className="size-8 rounded-full bg-accent text-primary-foreground hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isTranscribing}
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

/**
 * Continuously scrolling bar timeline used as the recording-state
 * indicator. Renders the bars twice end-to-end and translates the
 * inner strip leftward via CSS keyframe so the result reads as
 * "audio scrolling past a playhead" without an actual analyser node.
 *
 * `isPaused=true` halts the scroll (used while transcribing) so the
 * UI feels frozen on the captured timeline rather than ticking forward
 * after the recording ended.
 */
function WaveformTimeline({ isPaused }: { isPaused: boolean }): React.JSX.Element {
	return (
		<div className="relative flex h-8 min-w-0 flex-1 items-center overflow-hidden">
			<div
				aria-hidden="true"
				className="flex h-full items-center gap-[3px]"
				style={{
					animation: isPaused ? undefined : 'waveform-scroll 6s linear infinite',
				}}
			>
				{[...WAVEFORM_BARS, ...WAVEFORM_BARS].map((height, index) => (
					<span
						className="w-[2px] shrink-0 rounded-full bg-foreground/75"
						key={`bar-${index}-${height}`}
						style={{
							height,
							opacity: 0.4 + ((index % 5) / 5) * 0.6,
						}}
					/>
				))}
			</div>
			{/* Subtle right-side fade so the scroll edge doesn't read as a hard cut. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-foreground-5 to-transparent"
			/>
		</div>
	);
}
