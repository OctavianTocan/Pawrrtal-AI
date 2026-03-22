/**
 * AppShell - Main application layout container
 *
 * Simplified from Craft's AppShell. Provides the core layout structure:
 * - Fixed TopBar at the top
 * - Collapsible sidebar on the left
 * - Main content area on the right
 *
 * Uses Craft's panel system with rounded corners, gaps, and insets.
 * Multi-panel, navigator, workspace switcher etc. are deferred to later chunks.
 */

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSyncConversations } from "@/hooks/use-sync-conversations";
import { cn } from "@/lib/utils";
import { LeftSidebar } from "./LeftSidebar";
import { MainContentPanel } from "./MainContentPanel";
import {
	PANEL_EDGE_INSET,
	PANEL_GAP,
	RADIUS_EDGE,
	RADIUS_INNER,
	SIDEBAR_DEFAULT_WIDTH,
	TOPBAR_HEIGHT,
} from "./panel-constants";
import { SessionList } from "./SessionList";
import { TopBar } from "./TopBar";

// Spring transition matching Craft's sidebar animations
const springTransition = {
	type: "spring" as const,
	stiffness: 300,
	damping: 30,
};

interface AppShellProps {
	children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
	const router = useRouter();
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const handleToggleSidebar = useCallback(() => {
		setSidebarOpen((prev) => !prev);
	}, []);

	const handleNewChat = useCallback(() => {
		router.push("/");
	}, [router]);

	// Sync TanStack Query conversations into Jotai atom
	useSyncConversations();

	return (
		<TooltipProvider delayDuration={300}>
			{/* Background layer - matches Craft's window background */}
			<div className="fixed inset-0 bg-background-elevated" />

			{/* TopBar - fixed at top */}
			<TopBar onToggleSidebar={handleToggleSidebar} onNewChat={handleNewChat} />

			{/* Panel container - below topbar, with edge insets */}
			<div
				className="fixed flex"
				style={{
					top: TOPBAR_HEIGHT,
					left: 0,
					right: PANEL_EDGE_INSET,
					bottom: PANEL_EDGE_INSET,
					gap: PANEL_GAP,
				}}
			>
				{/* Sidebar panel */}
				<AnimatePresence initial={false}>
					{sidebarOpen && (
						<motion.div
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: SIDEBAR_DEFAULT_WIDTH, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={springTransition}
							className="shrink-0 overflow-hidden"
							style={{
								borderTopRightRadius: RADIUS_INNER,
								borderBottomRightRadius: RADIUS_EDGE,
							}}
						>
							<div
								className={cn(
									"h-full bg-background overflow-hidden flex flex-col",
								)}
								style={{
									borderTopRightRadius: RADIUS_INNER,
									borderBottomRightRadius: RADIUS_EDGE,
								}}
							>
								<LeftSidebar isCollapsed={false}>
									<SessionList />
								</LeftSidebar>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Main content panel */}
				<div
					className="flex-1 min-w-0 bg-background overflow-hidden"
					style={{
						borderTopLeftRadius: sidebarOpen ? RADIUS_INNER : RADIUS_EDGE,
						borderTopRightRadius: RADIUS_EDGE,
						borderBottomLeftRadius: sidebarOpen ? RADIUS_INNER : RADIUS_EDGE,
						borderBottomRightRadius: RADIUS_EDGE,
					}}
				>
					<MainContentPanel>{children}</MainContentPanel>
				</div>
			</div>
		</TooltipProvider>
	);
}
