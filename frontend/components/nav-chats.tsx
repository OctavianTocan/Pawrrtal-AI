"use client";

import { Calligraph } from "calligraph";
import Image from "next/image";
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
								<Image
									src="/bars-rotate-fade.svg"
									width={15}
									height={15}
									alt="Animated Loader"
									unoptimized // Recommended for some animated SVGs to prevent caching issues
								/>
								<Calligraph>{conversation.title}</Calligraph>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
