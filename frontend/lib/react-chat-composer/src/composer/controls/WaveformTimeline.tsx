/**
 * Scrolling waveform timeline rendered while recording.
 *
 * @fileoverview Decorative animation indicating live audio capture. Pure
 * presentation — no audio analyser is wired up; the bars scroll via CSS
 * keyframe defined in `src/styles/animations.css`.
 */

'use client';

/**
 * Bar heights (px) used by the scrolling waveform. Intentionally jagged so
 * the timeline reads as "live audio" rather than a synthesizer-style EQ.
 */
const WAVEFORM_BARS = [
	6, 10, 8, 14, 22, 18, 12, 28, 20, 14, 8, 18, 24, 16, 10, 6, 12, 20, 28, 22, 14, 10, 16, 24, 18,
	12, 8, 14, 20, 26, 18, 12, 8, 16, 22, 28, 20, 14, 10, 6,
] as const;

/** Props for the waveform timeline. */
export interface WaveformTimelineProps {
	/** When true, freezes the scroll (used during the transcription window). */
	isPaused: boolean;
}

/**
 * Continuously scrolling bar timeline used as the recording-state indicator.
 *
 * Renders the bars twice end-to-end and translates the inner strip leftward
 * via a CSS keyframe so the result reads as "audio scrolling past a
 * playhead" without an actual analyser node. `isPaused=true` halts the
 * scroll while transcription is in flight.
 *
 * @returns A horizontal scrolling waveform with a right-side fade.
 */
export function WaveformTimeline({ isPaused }: WaveformTimelineProps): React.JSX.Element {
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
						className="w-[2px] shrink-0 rounded-full bg-[var(--color-chat-foreground)]"
						// Doubled-array keys are intentionally index-suffixed because the
						// two halves are identical — the height is part of the key only
						// to disambiguate the doubled run.
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
				className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[color:color-mix(in_oklch,var(--color-chat-foreground)_5%,transparent)] to-transparent"
			/>
		</div>
	);
}
