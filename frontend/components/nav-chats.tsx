"use client";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { ConversationSidebarItem } from "@/components/conversation-sidebar-item";
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
				{conversations.map((conversation, index) => (
					<ConversationSidebarItem
						key={conversation.id}
						id={conversation.id}
						title={conversation.title}
						updatedAt={conversation.updated_at}
						showSeparator={index > 0}
					/>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
