"use client";

import { IconPencilPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { NavChats } from "./nav-chats";
import { Separator } from "./ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "./ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/**
 * Application sidebar layout wrapper.
 *
 * Renders the sidebar with a "New Session" button and conversation history,
 * alongside the main content area with a sidebar toggle and header.
 *
 * @param children - The page content to render in the main area.
 */
export function NewSidebar({ children }: { children: React.ReactNode }) {
	const router = useRouter();

	/** Navigates to the root page, which generates a fresh conversation UUID. */
	const handleNewConversation = () => {
		router.push("/");
	};

	return (
		<SidebarProvider>
			<Sidebar variant="inset">
				<SidebarContent>
					<SidebarHeader className="px-2 pb-2 shrink-0">
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<button
										type="button"
										onClick={handleNewConversation}
										className="inline-flex items-center w-full justify-start gap-2 py-[7px] px-2 text-[13px] font-normal rounded-[6px] shadow-minimal bg-background"
										aria-label="New Session"
									>
										<IconPencilPlus className="h-3.5 w-3.5 shrink-0" />
										New Session
									</button>
								</div>
							</TooltipTrigger>
							<TooltipContent side="right">⌘N</TooltipContent>
						</Tooltip>
					</SidebarHeader>
					<NavChats />
				</SidebarContent>
			</Sidebar>
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1 cursor-pointer" />
						<Separator
							orientation="vertical"
							className="mr-2 data-vertical:h-4 data-vertical:self-auto"
						/>
					</div>
				</header>
				<div className="flex-1">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
