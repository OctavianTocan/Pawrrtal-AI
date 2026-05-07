'use client';

/**
 * Page-level header rendered ABOVE the rounded Knowledge card.
 *
 * The header sits on the page background so the warm sidebar surface is
 * visible above and around the card. Left side has a circular avatar
 * followed by the "Knowledge" title in the display font; right side has
 * a single status-chip group (Working / Review / Suggested) plus a
 * filter-stack icon and a "Select Files" button.
 */

import { LayersIcon, UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pre-defined chip tones. Reuses semantic tokens (`info`, `success`,
 * neutral foreground) — no literal palette colors introduced.
 */
type StatusChipTone = 'info' | 'success' | 'neutral';

interface StatusChipSegment {
	label: string;
	count: number;
	tone: StatusChipTone;
}

const TONE_DOT_CLASS: Record<StatusChipTone, string> = {
	info: 'bg-info text-info-text',
	success: 'bg-success text-success-text',
	neutral: 'bg-foreground-20 text-muted-foreground',
};

const STATUS_CHIPS: readonly StatusChipSegment[] = [
	{ label: 'Working', count: 1, tone: 'info' },
	{ label: 'Review', count: 5, tone: 'success' },
	{ label: 'Suggested', count: 0, tone: 'neutral' },
];

/**
 * Single segment of the grouped status chip.
 *
 * Each segment renders as `[Label] [colored count badge]`. Segments are
 * separated visually by a 1px divider drawn by the parent on every
 * segment except the last, keeping the chip a single rounded container.
 */
function StatusChipSegmentView({ segment }: { segment: StatusChipSegment }): ReactNode {
	return (
		<span className="inline-flex h-7 items-center gap-1.5 px-2.5 text-[12px] font-medium text-foreground">
			{segment.label}
			<span
				className={cn(
					'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums',
					TONE_DOT_CLASS[segment.tone]
				)}
			>
				{segment.count}
			</span>
		</span>
	);
}

/**
 * Page header. No props for now — once a real backend lands, accept the
 * three counts as props and forward them to {@link STATUS_CHIPS} mapping.
 */
export function KnowledgePageHeader(): ReactNode {
	return (
		<header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1 pb-1">
			<div className="flex items-center gap-2">
				<span
					aria-hidden="true"
					className="flex size-7 items-center justify-center rounded-full bg-foreground-10 text-foreground"
				>
					<UserIcon className="size-4" />
				</span>
				<h1 className="font-display text-[22px] font-medium leading-none text-foreground">
					Knowledge
				</h1>
			</div>

			<div className="flex items-center gap-2">
				{/*
				 * Grouped chip — one rounded container with vertical dividers
				 * between segments so it reads as a single affordance rather
				 * than three separate pills. Matches the visual: amber
				 * "Working", green "Review", neutral "Suggested".
				 */}
				<div className="inline-flex items-center rounded-full border border-border bg-background-elevated">
					{STATUS_CHIPS.map((segment, index) => (
						<div
							key={segment.label}
							className={cn(
								'flex items-center',
								index > 0 ? 'border-l border-border/60' : null
							)}
						>
							<StatusChipSegmentView segment={segment} />
						</div>
					))}
					<button
						type="button"
						aria-label="Filter knowledge"
						className="flex h-7 cursor-pointer items-center justify-center border-l border-border/60 px-2 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
					>
						<LayersIcon aria-hidden="true" className="size-3.5" />
					</button>
				</div>

				<button
					type="button"
					className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-foreground-5 hover:text-foreground"
				>
					Select Files
				</button>
			</div>
		</header>
	);
}
