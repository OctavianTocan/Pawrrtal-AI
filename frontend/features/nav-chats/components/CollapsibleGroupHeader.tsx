'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleGroupHeaderProps {
	/** The date-group label text (e.g. "Today", "Yesterday", "Mar 25"). */
	label: string;
	/** Whether this group is currently collapsed. */
	isCollapsed: boolean;
	/** Number of items hidden behind the collapsed state. */
	itemCount: number;
	/** Called when the user clicks to toggle the group open/closed. */
	onToggle: () => void;
}

/**
 * A clickable section header for a conversation date group.
 *
 * Shows a chevron that rotates when expanded, the group label, and —
 * when collapsed — an item count badge so the user knows how many
 * conversations are hidden.
 */
export function CollapsibleGroupHeader({
	label,
	isCollapsed,
	itemCount,
	onToggle,
}: CollapsibleGroupHeaderProps): React.JSX.Element {
	return (
		<li>
			<button
				type="button"
				onClick={onToggle}
				className="w-full py-2 px-4 flex items-center gap-1.5 cursor-pointer group/header relative"
			>
				<div className="absolute inset-y-0.5 left-2 right-2 rounded-[6px] group-hover/header:bg-foreground/2 transition-colors pointer-events-none" />
				<ChevronRight
					className={cn(
						'h-3.5 w-3.5 text-muted-foreground/60 transition-transform relative',
						!isCollapsed && 'rotate-90'
					)}
				/>
				<span className="text-sm font-medium text-muted-foreground relative">
					{label}
					{isCollapsed ? (
						<>
							{' · '}
							<span className="text-muted-foreground/50">{itemCount}</span>
						</>
					) : null}
				</span>
			</button>
		</li>
	);
}
