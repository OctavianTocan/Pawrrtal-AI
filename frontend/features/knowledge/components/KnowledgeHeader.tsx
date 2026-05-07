'use client';

/**
 * Top-of-page header for the Knowledge surface.
 *
 * Houses the page title (with a small avatar) on the left, and the three
 * status badges + settings button on the right. The badges are deliberately
 * mock for now — `count` is hardcoded — but they sit on the same axis as the
 * Sauna reference so wiring real values in later is one prop swap.
 */

import { SettingsIcon, UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Pre-defined badge tones. Matches DESIGN.md's `info` (amber), `success`
 * (green), and a neutral foreground tint — no literal colors introduced.
 */
type StatusBadgeTone = 'info' | 'success' | 'neutral';

interface StatusBadgeProps {
	label: string;
	count: number;
	tone: StatusBadgeTone;
}

const TONE_STYLES: Record<StatusBadgeTone, { pill: string; chip: string }> = {
	info: {
		pill: 'bg-info/10 text-info-text',
		chip: 'bg-info/15 text-info-text',
	},
	success: {
		pill: 'bg-success/10 text-success-text',
		chip: 'bg-success/15 text-success-text',
	},
	neutral: {
		pill: 'bg-foreground-5 text-muted-foreground',
		chip: 'bg-foreground-10 text-muted-foreground',
	},
};

/**
 * Single status pill rendered in the header's right cluster.
 *
 * The pill itself carries the tinted background; the trailing count chip
 * gets a slightly stronger tint of the same hue so it reads as a related
 * affordance rather than a separate element.
 */
function StatusBadge({ label, count, tone }: StatusBadgeProps): ReactNode {
	const style = TONE_STYLES[tone];
	return (
		<span
			className={cn(
				'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium',
				style.pill
			)}
		>
			{label}
			<span
				className={cn(
					'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums',
					style.chip
				)}
			>
				{count}
			</span>
		</span>
	);
}

/**
 * Header rendered at the top of the Knowledge panel.
 *
 * No props for now — once the real backend lands, accept `working`, `review`,
 * and `suggested` counts as props and forward them to each badge.
 */
export function KnowledgeHeader(): ReactNode {
	return (
		<header className="flex items-center justify-between gap-3 px-5 py-4">
			<div className="flex items-center gap-2">
				<span
					aria-hidden="true"
					className="flex size-7 items-center justify-center rounded-full bg-foreground-5 text-foreground"
				>
					<UserIcon className="size-4" />
				</span>
				<h1 className="font-display text-[20px] font-medium leading-none text-foreground">
					Knowledge
				</h1>
			</div>

			<div className="flex items-center gap-2">
				<StatusBadge label="Working" count={1} tone="info" />
				<StatusBadge label="Review" count={5} tone="success" />
				<StatusBadge label="Suggested" count={0} tone="neutral" />
				<button
					type="button"
					aria-label="Knowledge settings"
					className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-foreground-5 hover:text-foreground"
				>
					<SettingsIcon aria-hidden="true" className="size-4" />
				</button>
			</div>
		</header>
	);
}
