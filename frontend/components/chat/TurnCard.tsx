"use client";

import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";
import { Streamdown } from "streamdown";
import type { AgnoMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TurnCardProps {
	messages: AgnoMessage[];
}

const TurnCard = memo(
	function TurnCard({ messages }: TurnCardProps) {
		const [collapsed, setCollapsed] = useState(false);
		const combinedContent = messages.map((m) => m.content).join("\n\n");

		return (
			<motion.div
				className="rounded-xl border border-border/50 bg-card"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: "spring", stiffness: 500, damping: 30 }}
			>
				{/* Header */}
				<button
					type="button"
					onClick={() => setCollapsed((prev) => !prev)}
					className={cn(
						"flex w-full items-center justify-between px-4 py-2.5",
						"text-xs font-medium text-muted-foreground",
						"hover:bg-muted/50 transition-colors rounded-t-xl",
						collapsed && "rounded-b-xl",
					)}
				>
					<span>Assistant</span>
					<motion.span
						animate={{ rotate: collapsed ? -90 : 0 }}
						transition={{ type: "spring", stiffness: 400, damping: 25 }}
					>
						<ChevronDownIcon className="size-3.5" />
					</motion.span>
				</button>

				{/* Body */}
				<AnimatePresence initial={false}>
					{!collapsed && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ type: "spring", stiffness: 400, damping: 30 }}
							className="overflow-hidden"
						>
							<div className="px-4 pb-4 pt-1">
								<Streamdown className="text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
									{combinedContent}
								</Streamdown>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		);
	},
	(prev, next) => {
		if (prev.messages.length !== next.messages.length) return false;
		const prevLast = prev.messages[prev.messages.length - 1];
		const nextLast = next.messages[next.messages.length - 1];
		return prevLast?.content === nextLast?.content;
	},
);

export default TurnCard;
