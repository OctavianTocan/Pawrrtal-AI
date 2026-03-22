"use client";

import { IconMessage } from "@tabler/icons-react";
import { format, isToday, isYesterday } from "date-fns";
import { motion } from "motion/react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface SessionItemProps {
	id: string;
	title: string;
	updatedAt: string;
	isSelected: boolean;
	onClick: (id: string) => void;
}

function formatTimestamp(dateStr: string): string {
	const date = new Date(dateStr);
	if (isToday(date)) return format(date, "h:mm a");
	if (isYesterday(date)) return "Yesterday";
	return format(date, "MMM d");
}

export function SessionItem({
	id,
	title,
	updatedAt,
	isSelected,
	onClick,
}: SessionItemProps) {
	const handleClick = useCallback(() => {
		onClick(id);
	}, [id, onClick]);

	return (
		<motion.button
			type="button"
			layout="position"
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -4 }}
			transition={{ duration: 0.15 }}
			onClick={handleClick}
			data-selected={isSelected || undefined}
			className={cn(
				"session-item group w-full flex items-center gap-2",
				"py-[7px] px-2 text-[13px] rounded-md",
				"text-left transition-colors cursor-pointer",
				"hover:bg-foreground/5",
				isSelected && "bg-foreground/[0.07] text-foreground",
				!isSelected && "text-foreground/80",
			)}
		>
			<IconMessage className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
			<span className="flex-1 truncate">{title || "New conversation"}</span>
			<span className="shrink-0 text-[11px] text-foreground/40 tabular-nums">
				{formatTimestamp(updatedAt)}
			</span>
		</motion.button>
	);
}
