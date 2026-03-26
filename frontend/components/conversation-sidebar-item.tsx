"use client";

import { Circle, ExternalLink, FolderOpen, Link2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { EntityRow } from "@/components/ui/entity-row";
import { useMenuComponents } from "@/components/ui/menu-context";
import { SidebarMenuItem } from "@/components/ui/sidebar";

interface ConversationSidebarItemProps {
	id: string;
	title: ReactNode;
	ariaLabel: string;
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

function ConversationStatusIcon() {
	return (
		<div className="flex items-center justify-center text-muted-foreground/75">
			<Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
		</div>
	);
}

function ConversationMenuContent({
	href,
	label: _label,
}: {
	href: string;
	label: string;
}) {
	const router = useRouter();
	const { MenuItem, MenuSeparator } = useMenuComponents();
	const absoluteHref = useMemo(() => {
		if (typeof window === "undefined") {
			return href;
		}

		return new URL(href, window.location.origin).toString();
	}, [href]);

	return (
		<>
			<MenuItem onClick={() => router.push(href)}>
				<FolderOpen className="h-4 w-4" />
				Open
			</MenuItem>
			<MenuItem
				onClick={() => {
					if (typeof window !== "undefined") {
						window.open(href, "_blank", "noopener,noreferrer");
					}
				}}
			>
				<ExternalLink className="h-4 w-4" />
				Open in New Tab
			</MenuItem>
			<MenuSeparator />
			<MenuItem
				onClick={() => {
					if (typeof navigator !== "undefined" && navigator.clipboard) {
						void navigator.clipboard.writeText(absoluteHref);
					}
				}}
			>
				<Link2 className="h-4 w-4" />
				Copy Link
			</MenuItem>
		</>
	);
}

export function ConversationSidebarItem({
	id,
	title,
	ariaLabel,
	updatedAt,
	showSeparator,
}: ConversationSidebarItemProps) {
	const router = useRouter();
	const pathname = usePathname();
	const href = `/c/${id}`;
	const isSelected = pathname === href;
	const age = formatConversationAge(updatedAt);

	return (
		<SidebarMenuItem>
			<EntityRow
				icon={<ConversationStatusIcon />}
				showSeparator={showSeparator}
				isSelected={isSelected}
				onClick={() => router.push(href)}
				title={title}
				titleClassName="text-[13px]"
				titleTrailing={
					age ? (
						<span className="text-[11px] text-foreground/40 whitespace-nowrap">
							{age}
						</span>
					) : undefined
				}
				menuContent={<ConversationMenuContent href={href} label={ariaLabel} />}
			/>
		</SidebarMenuItem>
	);
}
