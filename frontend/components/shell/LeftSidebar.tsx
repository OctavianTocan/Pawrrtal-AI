/**
 * LeftSidebar - Simplified sidebar navigation panel
 *
 * Adapted from Craft's LeftSidebar. For now, this is a placeholder
 * that renders a scrollable container for navigation items.
 * Chunk 3 will add the session list and full navigation.
 *
 * Styling follows Craft's sidebar patterns:
 * - py-[7px] px-2 text-[13px] rounded-md for items
 * - Icon: h-3.5 w-3.5
 */

"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LeftSidebarProps {
	/** Whether the sidebar is collapsed */
	isCollapsed: boolean;
	/** Sidebar content (navigation items, session list, etc.) */
	children?: React.ReactNode;
	/** Optional className */
	className?: string;
}

export function LeftSidebar({
	isCollapsed,
	children,
	className,
}: LeftSidebarProps) {
	if (isCollapsed) return null;

	return (
		<ScrollArea className={cn("flex flex-col h-full select-none", className)}>
			<nav className="grid gap-0.5 px-2 py-1" aria-label="Main navigation">
				{children}
			</nav>
		</ScrollArea>
	);
}
