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
