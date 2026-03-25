"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EntityRow } from "@/components/ui/entity-row";
import { SidebarMenuItem } from "@/components/ui/sidebar";

interface ConversationSidebarItemProps {
	id: string;
	title: string;
	updatedAt: string;
	showSeparator: boolean;
}

function formatConversationAge(updatedAt: string) {
	const date = new Date(updatedAt);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	const diffSeconds = Math.max(
		0,
		Math.floor((Date.now() - date.getTime()) / 1000),
	);

	if (diffSeconds < 60) {
		return `${diffSeconds}s`;
	}

	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) {
		return `${diffMinutes}m`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours}h`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) {
		return `${diffDays}d`;
	}

	const diffWeeks = Math.floor(diffDays / 7);
	if (diffWeeks < 5) {
		return `${diffWeeks}w`;
	}

	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) {
		return `${diffMonths}mo`;
	}

	return `${Math.floor(diffDays / 365)}y`;
}

export function ConversationSidebarItem({
	id,
	title,
	updatedAt,
	showSeparator,
}: ConversationSidebarItemProps) {
	const pathname = usePathname();
	const href = `/c/${id}`;
	const isSelected = pathname === href;
	const age = formatConversationAge(updatedAt);

	return (
		<SidebarMenuItem>
			<EntityRow
				asChild
				showSeparator={showSeparator}
				isSelected={isSelected}
				title={title}
				titleClassName="text-[13px]"
				titleTrailing={
					age ? (
						<span className="text-[11px] text-foreground/40 whitespace-nowrap">
							{age}
						</span>
					) : undefined
				}
			>
				<Link
					href={href}
					className="absolute inset-0 rounded-[8px]"
					aria-label={title}
				/>
			</EntityRow>
		</SidebarMenuItem>
	);
}
