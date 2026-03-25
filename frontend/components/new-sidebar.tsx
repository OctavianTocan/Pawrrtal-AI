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
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "./ui/sidebar";

/**
 * Application sidebar layout wrapper.
 *
 * Renders the sidebar with a "New Conversation" button and conversation history,
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
					<SidebarHeader className="pb-1">
						<SidebarMenuItem>
							<SidebarMenuButton
								className="h-auto cursor-pointer justify-start rounded-[6px] bg-background px-2 py-[7px] text-[13px] shadow-minimal hover:bg-background active:bg-background"
								onClick={handleNewConversation}
								type="button"
							>
								<IconPencilPlus />
								<span>New Conversation</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
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
