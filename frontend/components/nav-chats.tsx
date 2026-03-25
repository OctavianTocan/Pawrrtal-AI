"use client";

import { ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ConversationSidebarItem } from "@/components/conversation-sidebar-item";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import useGetConversations from "@/hooks/get-conversations";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLLAPSED_GROUPS_STORAGE_KEY = "nav-chats-collapsed-groups";

type ConversationGroup = {
	key: string;
	label: string;
	items: Conversation[];
};

function getConversationDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function getConversationTimestamp(conversation: Conversation) {
	const date =
		getConversationDate(conversation.updated_at) ??
		getConversationDate(conversation.created_at);

	return date?.getTime() ?? 0;
}

function getLocalDayKey(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function isSameLocalDay(left: Date, right: Date) {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

function formatDateGroupLabel(date: Date) {
	const now = new Date();
	if (isSameLocalDay(date, now)) {
		return "Today";
	}

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (isSameLocalDay(date, yesterday)) {
		return "Yesterday";
	}

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	}).format(date);
}

function buildConversationGroups(
	conversations: Conversation[],
): ConversationGroup[] {
	const sortedConversations = [...conversations].sort(
		(left, right) =>
			getConversationTimestamp(right) - getConversationTimestamp(left),
	);

	const groups = new Map<string, ConversationGroup>();
	for (const conversation of sortedConversations) {
		const date =
			getConversationDate(conversation.updated_at) ??
			getConversationDate(conversation.created_at) ??
			new Date(0);
		const key = getLocalDayKey(date);

		if (!groups.has(key)) {
			groups.set(key, {
				key,
				label: formatDateGroupLabel(date),
				items: [],
			});
		}

		groups.get(key)?.items.push(conversation);
	}

	return [...groups.values()];
}

function CollapsibleGroupHeader({
	label,
	isCollapsed,
	itemCount,
	onToggle,
}: {
	label: string;
	isCollapsed: boolean;
	itemCount: number;
	onToggle: () => void;
}) {
	return (
		<li>
			<button
				type="button"
				onClick={onToggle}
				className="w-full py-2 px-4 flex items-center gap-1.5 cursor-pointer group/header relative"
			>
				<div className="absolute inset-y-0.5 left-2 right-2 rounded-[6px] group-hover/header:bg-foreground/2 transition-colors pointer-events-none" />
				<ChevronRight
					className={cn(
						"h-3 w-3 text-muted-foreground/60 transition-transform relative",
						!isCollapsed && "rotate-90",
					)}
				/>
				<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground relative">
					{label}
					{isCollapsed ? (
						<>
							{" · "}
							<span className="text-muted-foreground/50">{itemCount}</span>
						</>
					) : null}
				</span>
			</button>
		</li>
	);
}

function SectionHeader({ label }: { label: string }) {
	return (
		<li className="px-4 py-2">
			<span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
				{label}
			</span>
		</li>
	);
}

// TODO: This needs to take in conversations/chats.
export function NavChats() {
	// Get the conversations for the current user.
	const { data: conversations } = useGetConversations();
	const groups = useMemo(
		() => buildConversationGroups(conversations ?? []),
		[conversations],
	);
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
		if (typeof window === "undefined") {
			return new Set();
		}

		try {
			const storedGroups = window.localStorage.getItem(
				COLLAPSED_GROUPS_STORAGE_KEY,
			);
			if (!storedGroups) {
				return new Set();
			}

			const parsedGroups = JSON.parse(storedGroups);
			return new Set(Array.isArray(parsedGroups) ? parsedGroups : []);
		} catch {
			return new Set();
		}
	});

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(
			COLLAPSED_GROUPS_STORAGE_KEY,
			JSON.stringify([...collapsedGroups]),
		);
	}, [collapsedGroups]);

	// If there are no conversations, return null.
	if (!conversations || conversations.length === 0) return null;

	const toggleGroupCollapse = (groupKey: string) => {
		setCollapsedGroups((currentGroups) => {
			const nextGroups = new Set(currentGroups);
			if (nextGroups.has(groupKey)) {
				nextGroups.delete(groupKey);
			} else {
				nextGroups.add(groupKey);
			}
			return nextGroups;
		});
	};

	// If there are conversations, render the sidebar group and menu.
	return (
		<SidebarGroup className="pt-1">
			<SidebarGroupLabel>Your Chats</SidebarGroupLabel>
			<SidebarMenu className="gap-0">
				{groups.map((group) => {
					const isCollapsible = groups.length > 1;
					const isCollapsed = collapsedGroups.has(group.key);

					return (
						<Fragment key={group.key}>
							{isCollapsible ? (
								<CollapsibleGroupHeader
									label={group.label}
									isCollapsed={isCollapsed}
									itemCount={group.items.length}
									onToggle={() => toggleGroupCollapse(group.key)}
								/>
							) : (
								<SectionHeader label={group.label} />
							)}
							{isCollapsible && isCollapsed
								? null
								: group.items.map((conversation, index) => (
										<ConversationSidebarItem
											key={conversation.id}
											id={conversation.id}
											title={conversation.title}
											updatedAt={conversation.updated_at}
											showSeparator={index > 0}
										/>
									))}
						</Fragment>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
