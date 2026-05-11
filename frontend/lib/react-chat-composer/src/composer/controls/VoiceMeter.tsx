/**
 * VoiceMeter — live recording controls + waveform.
 *
 * @fileoverview Renders the in-row recording UI: a scrolling waveform, an
 * elapsed timer, a stop button, and a send-and-transcribe button.
 */

'use client';

import { ArrowUpIcon, Loader2, SquareIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { ComposerTooltip } from './ComposerTooltip';
import { formatRecordingTime } from './transcript';
import { WaveformTimeline } from './WaveformTimeline';

/** Props for the live voice meter. */
export interface VoiceMeterProps {
	/** Elapsed recording time in whole seconds. */
	elapsedSeconds: number;
	/** When true, swap the stop button for a loader and disable Send. */
	isTranscribing?: boolean;
	/** Fired when the user stops + sends (transcribe and submit). */
	onSend: () => void;
	/** Fired when the user stops without sending (transcribe into draft). */
	onStop: () => void;
}

/**
 * Renders live voice recording controls and the animated voice meter.
 *
 * Replaces the composer's normal toolbar row while the user is recording or
 * transcribing.
 *
 * @returns The waveform + timer + stop/send cluster.
 */
export function VoiceMeter({
	elapsedSeconds,
	isTranscribing,
	onSend,
	onStop,
}: VoiceMeterProps): React.JSX.Element {
	return (
		<div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
			<WaveformTimeline isPaused={Boolean(isTranscribing)} />
			<span className="w-9 text-right text-[12px] text-[var(--color-chat-muted)] tabular-nums">
				{formatRecordingTime(elapsedSeconds)}
			</span>
			<ComposerTooltip content={isTranscribing ? 'Transcribing…' : 'Stop and transcribe'}>
				<Button
					aria-label={isTranscribing ? 'Transcribing' : 'Stop and transcribe'}
					className="size-8 rounded-full bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_10%,transparent)] text-[var(--color-chat-foreground)] hover:bg-[color:color-mix(in_oklch,var(--color-chat-foreground)_15%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
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
			<ComposerTooltip content={isTranscribing ? 'Wait for transcription' : 'Transcribe and send'}>
				<Button
					aria-label="Transcribe and send"
					className="size-8 rounded-full bg-[var(--color-chat-accent)] text-[var(--color-chat-accent-foreground)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
