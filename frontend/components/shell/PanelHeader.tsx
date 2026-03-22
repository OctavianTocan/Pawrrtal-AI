/**
 * PanelHeader - Standardized header component for panels
 *
 * Provides consistent header styling with:
 * - Fixed 42px height
 * - Title with optional badge
 * - Optional action buttons
 *
 * Simplified from Craft's PanelHeader (no stoplight compensation,
 * no title dropdown menu). Those features can be added later.
 */

"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface PanelHeaderProps {
	/** Header title */
	title?: string;
	/** Optional badge element */
	badge?: React.ReactNode;
	/** Optional action buttons rendered on the right */
	actions?: React.ReactNode;
	/** Optional className for additional styling */
	className?: string;
}

/**
 * Standardized panel header with title and actions
 */
export function PanelHeader({
	title,
	badge,
	actions,
	className,
}: PanelHeaderProps) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center pl-4 pr-2 min-w-0 gap-1.5 relative h-[42px]",
				className,
			)}
		>
			<div className="flex-1 min-w-0 flex items-center select-none">
				<div className="mx-auto w-fit">
					<motion.div
						initial={false}
						animate={{ opacity: title ? 1 : 0 }}
						transition={{ duration: 0.15 }}
						className="flex items-center gap-1"
					>
						<h1 className="text-sm font-semibold truncate font-sans leading-tight">
							{title}
						</h1>
						{badge}
					</motion.div>
				</div>
			</div>
			{actions && <div className="shrink-0">{actions}</div>}
		</div>
	);
}
