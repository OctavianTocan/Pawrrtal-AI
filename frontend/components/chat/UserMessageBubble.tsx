"use client";

import { motion } from "motion/react";
import type { AgnoMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UserMessageBubbleProps {
	messages: AgnoMessage[];
}

export default function UserMessageBubble({
	messages,
}: UserMessageBubbleProps) {
	return (
		<motion.div
			className="flex justify-end"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ type: "spring", stiffness: 500, damping: 30 }}
		>
			<div
				className={cn(
					"max-w-[85%] rounded-2xl px-4 py-2.5",
					"bg-accent text-accent-foreground",
					"text-sm leading-relaxed",
				)}
			>
				{messages.map((msg, i) => (
					<p key={msg.content.slice(0, 48)} className={cn(i > 0 && "mt-2")}>
						{msg.content}
					</p>
				))}
			</div>
		</motion.div>
	);
}
