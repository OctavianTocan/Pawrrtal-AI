"use client";

import {
	Circle,
	ExternalLink,
	FolderOpen,
	Link2,
	MoreHorizontal,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { EntityRow } from "@/components/ui/entity-row";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function ConversationRowMenu({
	href,
	label,
	age,
}: {
	href: string;
	label: string;
	age: string | null;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const absoluteHref = useMemo(() => {
		if (typeof window === "undefined") {
			return href;
		}

		return new URL(href, window.location.origin).toString();
	}, [href]);

	const openInNewTab = () => {
		if (typeof window === "undefined") {
			return;
		}

		window.open(href, "_blank", "noopener,noreferrer");
	};

	const copyLink = async () => {
		if (typeof navigator === "undefined" || !navigator.clipboard) {
			return;
		}

		await navigator.clipboard.writeText(absoluteHref);
	};

	return (
		<>
			{age ? (
				<span
					className={open ? "invisible" : "group-hover:invisible text-[11px] text-foreground/40 whitespace-nowrap"}
				>
					{age}
				</span>
			) : null}
			<div
				className={open ? "absolute inset-0 flex items-center justify-end opacity-100" : "absolute inset-0 flex items-center justify-end opacity-0 group-hover:opacity-100"}
			>
				<DropdownMenu onOpenChange={setOpen}>
					<DropdownMenuTrigger asChild>
						<div
							className="p-1 rounded-[6px] hover:bg-foreground/10 data-[state=open]:bg-foreground/10 cursor-pointer"
							onClick={(event) => event.stopPropagation()}
							onMouseDown={(event) => event.stopPropagation()}
							onKeyDown={(event) => {
								event.stopPropagation();
							}}
							role="button"
							tabIndex={0}
							aria-label={`Open actions for ${label}`}
						>
							<MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-44">
						<DropdownMenuItem
							onClick={(event) => {
								event.stopPropagation();
								router.push(href);
							}}
						>
							<FolderOpen className="h-4 w-4" />
							Open
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(event) => {
								event.stopPropagation();
								openInNewTab();
							}}
						>
							<ExternalLink className="h-4 w-4" />
							Open in New Tab
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={(event) => {
								event.stopPropagation();
								void copyLink();
							}}
						>
							<Link2 className="h-4 w-4" />
							Copy Link
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
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
					<ConversationRowMenu href={href} label={ariaLabel} age={age} />
				}
			/>
		</SidebarMenuItem>
	);
}
