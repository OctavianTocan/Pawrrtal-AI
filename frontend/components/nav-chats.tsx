"use client";

import Link from "next/link";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import useGetConversations from "@/hooks/get-conversations";

// TODO: This needs to take in conversations/chats.
export function NavChats() {
	// Get the conversations for the current user.
	const { data: conversations } = useGetConversations();
	// If there are no conversations, return null.
	if (!conversations || conversations.length === 0) return null;

	// If there are conversations, render the sidebar group and menu.
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Your Chats</SidebarGroupLabel>
			<SidebarMenu>
				{conversations.map((conversation) => (
					<SidebarMenuItem key={conversation.id}>
						<SidebarMenuButton asChild tooltip={conversation.title}>
							{/* Using link for soft navigation. */}
							<Link href={`/c/${conversation.id}`}>
								<span>{conversation.title}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
