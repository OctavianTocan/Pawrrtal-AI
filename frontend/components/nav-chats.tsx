"use client";

import { ChevronRight, Inbox, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { ConversationSearchHeader } from "@/components/conversation-search-header";
import { ConversationSidebarItem } from "@/components/conversation-sidebar-item";
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

function highlightMatch(text: string, query: string): React.ReactNode {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return text;
	}

	const lowerText = text.toLowerCase();
	const lowerQuery = trimmedQuery.toLowerCase();
	const index = lowerText.indexOf(lowerQuery);

	if (index === -1) {
		return text;
	}

	const before = text.slice(0, index);
	const match = text.slice(index, index + trimmedQuery.length);
	const after = text.slice(index + trimmedQuery.length);

	return (
		<>
			{before}
			<span className="bg-yellow-300/25 rounded-[3px] px-[1px]">{match}</span>
			{highlightMatch(after, trimmedQuery)}
		</>
	);
}

function filterConversationGroups(
	groups: ConversationGroup[],
	searchQuery: string,
): ConversationGroup[] {
	const trimmedQuery = searchQuery.trim().toLowerCase();
	if (trimmedQuery.length < 2) {
		return groups;
	}

	return groups
		.map((group) => ({
			...group,
			items: group.items.filter((conversation) =>
				conversation.title.toLowerCase().includes(trimmedQuery),
			),
		}))
		.filter((group) => group.items.length > 0);
}

function countGroupItems(groups: ConversationGroup[]) {
	return groups.reduce((total, group) => total + group.items.length, 0);
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

function ConversationsEmptyState({
	icon,
	title,
	description,
	buttonLabel,
	onAction,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	buttonLabel?: string;
	onAction?: () => void;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
			<div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-foreground/[0.03] text-muted-foreground/70 shadow-minimal">
				{icon}
			</div>
			<h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
			<p className="mt-1.5 max-w-[220px] text-xs leading-5 text-muted-foreground">
				{description}
			</p>
			{buttonLabel && onAction ? (
				<button
					type="button"
					onClick={onAction}
					className="mt-4 inline-flex items-center h-7 px-3 text-xs font-medium rounded-[8px] bg-background shadow-minimal hover:bg-foreground/[0.03] transition-colors"
				>
					{buttonLabel}
				</button>
			) : null}
		</div>
	);
}

export function NavChats() {
	const router = useRouter();
	const { data: conversations, isLoading } = useGetConversations();
	const [searchQuery, setSearchQuery] = useState("");
	const groups = useMemo(
		() => buildConversationGroups(conversations ?? []),
		[conversations],
	);
	const filteredGroups = useMemo(
		() => filterConversationGroups(groups, searchQuery),
		[groups, searchQuery],
	);
	const isSearchActive = searchQuery.trim().length >= 2;
	const resultCount = useMemo(
		() => countGroupItems(filteredGroups),
		[filteredGroups],
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

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<ConversationSearchHeader
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				onSearchClose={() => setSearchQuery("")}
				resultCount={resultCount}
			/>
			{isLoading ? null : !conversations || conversations.length === 0 ? (
				<ConversationsEmptyState
					icon={<Inbox className="h-4 w-4" />}
					title="No sessions yet"
					description="Sessions with your agent appear here. Start one to get going."
					buttonLabel="New Session"
					onAction={() => router.push("/")}
				/>
			) : isSearchActive && resultCount === 0 ? (
				<ConversationsEmptyState
					icon={<Search className="h-4 w-4" />}
					title="No matching sessions"
					description="Try a different title fragment. Search lights up once you have at least two characters."
				/>
			) : (
				<div className="pt-1">
					<ul className="flex w-full min-w-0 flex-col gap-0">
						{filteredGroups.map((group) => {
							const isCollapsible =
								!isSearchActive && filteredGroups.length > 1;
							const isCollapsed =
								!isSearchActive && collapsedGroups.has(group.key);

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
									{isCollapsed
										? null
										: group.items.map((conversation, index) => (
												<ConversationSidebarItem
													key={conversation.id}
													id={conversation.id}
													title={
														isSearchActive
															? highlightMatch(conversation.title, searchQuery)
															: conversation.title
													}
													ariaLabel={conversation.title}
													updatedAt={conversation.updated_at}
													showSeparator={index > 0}
												/>
											))}
								</Fragment>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}
