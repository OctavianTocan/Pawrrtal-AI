'use client';

/**
 * Vertical list of memory category cards rendered inside the Memory sub-view.
 *
 * Each card has a tinted icon chip, a title, a one-line description, and a
 * small count pill aligned to the right. Tones map to existing semantic
 * tokens (info / success / accent / destructive / foreground neutrals) so
 * we never introduce literal colors.
 */

import {
	BookOpenIcon,
	BrainIcon,
	HistoryIcon,
	type LucideIcon,
	ShieldIcon,
	SparklesIcon,
	UserIcon,
	UsersIcon,
	WrenchIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { MemoryCardData, MemoryCardTone } from '../types';

const TONE_CLASSNAMES: Record<MemoryCardTone, string> = {
	info: 'bg-info/12 text-info-text',
	success: 'bg-success/12 text-success-text',
	accent: 'bg-accent/12 text-accent',
	destructive: 'bg-destructive/12 text-destructive-text',
	foreground: 'bg-foreground-5 text-muted-foreground',
};

/**
 * Lookup from card id to the icon used inside its tinted chip.
 *
 * Kept as a dictionary rather than baking the icon into `mock-data.ts` so
 * the data file stays free of React/Lucide imports — easier to migrate to a
 * server-fetched payload later.
 */
const ICON_BY_ID: Record<string, LucideIcon> = {
	preferences: SparklesIcon,
	rules: ShieldIcon,
	profile: UserIcon,
	tools: WrenchIcon,
	identity: BrainIcon,
	relationships: UsersIcon,
	activity: HistoryIcon,
};

interface MemoryCardListProps {
	cards: readonly MemoryCardData[];
}

/**
 * Pure presentation. Cards are not currently interactive — they'll wire up
 * to detail routes once a real Memory backend lands.
 */
export function MemoryCardList({ cards }: MemoryCardListProps): ReactNode {
	return (
		<ul className="flex flex-col gap-2">
			{cards.map((card) => {
				const Icon = ICON_BY_ID[card.id] ?? BookOpenIcon;
				return (
					<li key={card.id}>
						<button
							type="button"
							className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border bg-background-elevated p-3 text-left transition-shadow duration-150 ease-out hover:shadow-minimal"
						>
							<span
								className={cn(
									'flex size-9 shrink-0 items-center justify-center rounded-md',
									TONE_CLASSNAMES[card.tone]
								)}
							>
								<Icon aria-hidden="true" className="size-4" />
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-[13px] font-medium text-foreground">
									{card.title}
								</span>
								<span className="truncate text-[12px] text-muted-foreground">
									{card.description}
								</span>
							</span>
							<span className="rounded-full bg-foreground-5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
								{card.count}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
