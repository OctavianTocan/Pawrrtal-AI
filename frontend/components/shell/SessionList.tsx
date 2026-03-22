"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { compareDesc, isThisWeek, isToday, isYesterday } from "date-fns";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
	conversationsAtom,
	selectedConversationIdAtom,
} from "@/atoms/sessions";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SessionItem } from "./SessionItem";
import { SessionSearchHeader } from "./SessionSearchHeader";

type DateGroup = "Today" | "Yesterday" | "This Week" | "Older";

interface GroupedConversations {
	label: DateGroup;
	items: Conversation[];
}

const GROUP_ORDER: DateGroup[] = ["Today", "Yesterday", "This Week", "Older"];

function classifyDate(dateStr: string): DateGroup {
	const date = new Date(dateStr);
	if (isToday(date)) return "Today";
	if (isYesterday(date)) return "Yesterday";
	if (isThisWeek(date, { weekStartsOn: 1 })) return "This Week";
	return "Older";
}

function groupConversations(
	conversations: Conversation[],
): GroupedConversations[] {
	const groups = new Map<DateGroup, Conversation[]>();

	for (const conv of conversations) {
		const group = classifyDate(conv.updated_at);
		const existing = groups.get(group);
		if (existing) {
			existing.push(conv);
		} else {
			groups.set(group, [conv]);
		}
	}

	// Sort items within each group by updated_at descending
	for (const items of groups.values()) {
		items.sort((a, b) =>
			compareDesc(new Date(a.updated_at), new Date(b.updated_at)),
		);
	}

	return GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({
		label,
		items: groups.get(label) as Conversation[],
	}));
}

export function SessionList() {
	const conversations = useAtomValue(conversationsAtom);
	const selectedId = useAtomValue(selectedConversationIdAtom);
	const router = useRouter();

	const [search, setSearch] = useState("");
	const [collapsedGroups, setCollapsedGroups] = useState<Set<DateGroup>>(
		new Set(),
	);

	const filtered = useMemo(() => {
		if (!search.trim()) return conversations;
		const query = search.toLowerCase();
		return conversations.filter((c) => c.title.toLowerCase().includes(query));
	}, [conversations, search]);

	const groups = useMemo(() => groupConversations(filtered), [filtered]);

	const handleSelect = useCallback(
		(id: string) => {
			router.push(`/c/${id}`);
		},
		[router],
	);

	const toggleGroup = useCallback((label: DateGroup) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(label)) {
				next.delete(label);
			} else {
				next.add(label);
			}
			return next;
		});
	}, []);

	if (conversations.length === 0) {
		return (
			<div className="px-3 py-6 text-center text-[13px] text-foreground/40">
				No conversations yet
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<SessionSearchHeader value={search} onChange={setSearch} />

			{filtered.length === 0 && search.trim() && (
				<div className="px-3 py-4 text-center text-[13px] text-foreground/40">
					No results for &ldquo;{search}&rdquo;
				</div>
			)}

			{groups.map((group) => {
				const isCollapsed = collapsedGroups.has(group.label);
				return (
					<div key={group.label} className="mb-0.5">
						<button
							type="button"
							onClick={() => toggleGroup(group.label)}
							className={cn(
								"flex w-full items-center gap-1 px-3 py-1.5",
								"text-[11px] font-medium uppercase tracking-wider",
								"text-foreground/40 hover:text-foreground/60 transition-colors",
							)}
						>
							<motion.span
								animate={{ rotate: isCollapsed ? -90 : 0 }}
								transition={{ duration: 0.15 }}
								className="inline-flex"
							>
								<IconChevronDown className="h-3 w-3" />
							</motion.span>
							{group.label}
							<span className="ml-auto text-foreground/25 tabular-nums">
								{group.items.length}
							</span>
						</button>

						<AnimatePresence initial={false}>
							{!isCollapsed && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{
										height: { type: "spring", stiffness: 400, damping: 30 },
										opacity: { duration: 0.15 },
									}}
									className="overflow-hidden"
								>
									{group.items.map((conv) => (
										<SessionItem
											key={conv.id}
											id={conv.id}
											title={conv.title}
											updatedAt={conv.updated_at}
											isSelected={conv.id === selectedId}
											onClick={handleSelect}
										/>
									))}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				);
			})}
		</div>
	);
}
