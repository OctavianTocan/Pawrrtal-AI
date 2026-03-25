"use client";

import { Calligraph } from "calligraph";
import { MessageSquareDashed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import useGetConversations from "@/hooks/get-conversations";

function NavChatsLoading() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Your Chats</SidebarGroupLabel>
			<SidebarGroupContent>
				<div className="bg-sidebar-accent/35 rounded-xl border border-dashed px-3 py-3">
					<div className="mb-3 space-y-1">
						<p className="text-sidebar-foreground text-sm font-medium">
							Loading conversations
						</p>
						<p className="text-sidebar-foreground/65 text-xs leading-5">
							Recent chats will appear here in a moment.
						</p>
					</div>
					<div className="space-y-1">
						<SidebarMenuSkeleton showIcon />
						<SidebarMenuSkeleton showIcon />
						<SidebarMenuSkeleton showIcon />
					</div>
				</div>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

function NavChatsEmpty() {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Your Chats</SidebarGroupLabel>
			<SidebarGroupContent>
				<div className="bg-sidebar-accent/25 rounded-xl border border-dashed px-3 py-4">
					<div className="mb-3 flex size-8 items-center justify-center rounded-lg border bg-background/80">
						<MessageSquareDashed className="size-4 text-sidebar-foreground/70" />
					</div>
					<p className="text-sidebar-foreground text-sm font-medium">
						No conversations yet
					</p>
					<p className="text-sidebar-foreground/65 mt-1 text-xs leading-5">
						Start a new conversation to pin your recent work here.
					</p>
				</div>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

// TODO: This needs to take in conversations/chats.
export function NavChats() {
	// Get the conversations for the current user.
	const { data: conversations, isPending } = useGetConversations();

	if (isPending) {
		return <NavChatsLoading />;
	}

	if (!conversations || conversations.length === 0) {
		return <NavChatsEmpty />;
	}

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
