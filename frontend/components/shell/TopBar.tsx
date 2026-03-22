/**
 * TopBar - Persistent top bar above all panels
 *
 * Simplified from Craft's TopBar. Contains:
 * - Sidebar toggle button
 * - App title/branding
 * - New chat button
 *
 * Fixed at top of window, 48px tall.
 */

"use client";

import { PanelLeft, SquarePen } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TOPBAR_HEIGHT } from "./panel-constants";

interface TopBarProps {
	onToggleSidebar: () => void;
	onNewChat?: () => void;
}

export function TopBar({ onToggleSidebar, onNewChat }: TopBarProps) {
	return (
		<div
			className="fixed top-0 left-0 right-0 z-50"
			style={{ height: TOPBAR_HEIGHT }}
		>
			<div className="flex h-full w-full items-center justify-between gap-2">
				{/* Left: Sidebar toggle */}
				<div className="flex items-center gap-1" style={{ paddingLeft: 86 }}>
					<Tooltip>
						<TooltipTrigger asChild>
							<TopBarButton
								onClick={onToggleSidebar}
								aria-label="Toggle sidebar"
							>
								<PanelLeft className="h-[18px] w-[18px] text-foreground/70" />
							</TopBarButton>
						</TooltipTrigger>
						<TooltipContent side="bottom">Toggle Sidebar</TooltipContent>
					</Tooltip>

					{/* App title */}
					<span className="text-sm font-semibold text-foreground/80 ml-2 select-none">
						Minnetonka
					</span>
				</div>

				{/* Right: New chat button */}
				<div className="flex items-center gap-1" style={{ paddingRight: 12 }}>
					{onNewChat && (
						<Tooltip>
							<TooltipTrigger asChild>
								<TopBarButton onClick={onNewChat} aria-label="New chat">
									<SquarePen
										className="h-4 w-4 text-foreground/50"
										strokeWidth={1.5}
									/>
								</TopBarButton>
							</TooltipTrigger>
							<TooltipContent side="bottom">New Chat</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * TopBarButton - Small icon button for the top bar.
 * Adapted from Craft's TopBarButton component.
 */
function TopBarButton({
	children,
	className,
	disabled,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center justify-center",
				"h-[28px] w-[28px] rounded-lg",
				"text-foreground/70 hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
				"transition-colors duration-100",
				"focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				"cursor-pointer",
				disabled && "opacity-30 pointer-events-none",
				className,
			)}
			disabled={disabled}
			{...props}
		>
			{children}
		</button>
	);
}
