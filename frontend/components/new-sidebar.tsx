"use client";
import { useRouter } from "next/navigation";
import { NavChats } from "./nav-chats";
import { Separator } from "./ui/separator";
import {
	Sidebar,
	SidebarContent,
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
					<SidebarMenuItem>
						<SidebarMenuButton
							className="cursor-pointer"
							onClick={handleNewConversation}
						>
							<span>New Conversation</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<NavChats />
				</SidebarContent>
			</Sidebar>
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center">
					<div className="flex items-center gap-1.5 px-3 py-2">
						<SidebarTrigger className="-ml-0.5 cursor-pointer" />
						<Separator
							orientation="vertical"
							className="bg-border/60 mr-1 data-vertical:h-3.5 data-vertical:self-auto"
						/>
					</div>
				</header>
				<div className="flex-1">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
