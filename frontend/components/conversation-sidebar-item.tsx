"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EntityRow } from "@/components/ui/entity-row";
import { cn } from "@/lib/utils";

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

	const diffMs = date.getTime() - Date.now();
	const divisions = [
		{ amount: 60, unit: "second" },
		{ amount: 60, unit: "minute" },
		{ amount: 24, unit: "hour" },
		{ amount: 7, unit: "day" },
	] as const;
	let duration = Math.round(diffMs / 1000);

	for (const division of divisions) {
		if (Math.abs(duration) < division.amount) {
			return new Intl.RelativeTimeFormat("en", {
				numeric: "auto",
			}).format(duration, division.unit);
		}

		duration = Math.round(duration / division.amount);
	}

	return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
		duration,
		"week",
	);
}

function conversationTone(seed: string) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) % 360;
	}

	const hue = Math.abs(hash);
	return {
		bg: `hsl(${hue} 90% 96%)`,
		fg: `hsl(${hue} 70% 42%)`,
		border: `hsl(${hue} 55% 78%)`,
	};
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
	const { bg, fg, border } = conversationTone(id);

	return (
		<EntityRow
			asChild
			showSeparator={showSeparator}
			isSelected={isSelected}
			icon={
				<span
					className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border"
					style={{ backgroundColor: bg, borderColor: border }}
					aria-hidden="true"
				>
					<span
						className="h-1.5 w-1.5 rounded-full"
						style={{ backgroundColor: fg }}
					/>
				</span>
			}
			title={
				<span className={cn("truncate", isSelected && "font-medium")}>
					{title}
				</span>
			}
			titleClassName={cn("text-[13px]", isSelected && "font-medium")}
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
	);
}
