import type { Conversation } from '@/lib/types';

/** A date-keyed bucket of conversations for the sidebar grouped list. */
export type ConversationGroup = {
	key: string;
	label: string;
	items: Conversation[];
};

/**
 * Parses a date string into a `Date`, returning `null` for invalid values.
 *
 * @param value - An ISO-8601 (or otherwise parseable) date string.
 */
function getConversationDate(value: string): Date | null {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Returns the latest meaningful timestamp for a conversation in epoch ms.
 *
 * Prefers `updated_at`; falls back to `created_at`, then epoch zero.
 */
function getConversationTimestamp(conversation: Conversation): number {
	const date =
		getConversationDate(conversation.updated_at) ??
		getConversationDate(conversation.created_at);

	return date?.getTime() ?? 0;
}

/**
 * Formats a `Date` into a locale-independent `YYYY-MM-DD` key string.
 *
 * Uses the user's local timezone so that "today" matches their clock.
 */
function getLocalDayKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

/** Returns `true` when both dates fall on the same calendar day (local tz). */
function isSameLocalDay(left: Date, right: Date): boolean {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

/**
 * Produces a human-readable group label for a given date.
 *
 * Returns `"Today"`, `"Yesterday"`, or a short month+day string
 * (e.g. `"Mar 25"`) depending on how recent the date is.
 */
function formatDateGroupLabel(date: Date): string {
	const now = new Date();
	if (isSameLocalDay(date, now)) {
		return 'Today';
	}

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (isSameLocalDay(date, yesterday)) {
		return 'Yesterday';
	}

	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(date);
}

/**
 * Groups conversations by calendar day, sorted newest-first.
 *
 * Each group's `items` array preserves the newest-first sort order.
 * Empty input produces an empty array (no "Today" placeholder).
 */
export function buildConversationGroups(conversations: Conversation[]): ConversationGroup[] {
	const sortedConversations = [...conversations].sort(
		(left, right) => getConversationTimestamp(right) - getConversationTimestamp(left)
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

/**
 * Filters conversation groups by a search query (case-insensitive title match).
 *
 * Queries shorter than 2 characters return the groups unchanged.
 * Groups with zero matching items are excluded from the result.
 */
export function filterConversationGroups(
	groups: ConversationGroup[],
	searchQuery: string
): ConversationGroup[] {
	const trimmedQuery = searchQuery.trim().toLowerCase();
	if (trimmedQuery.length < 2) {
		return groups;
	}

	return groups
		.map((group) => ({
			...group,
			items: group.items.filter((conversation) =>
				conversation.title.toLowerCase().includes(trimmedQuery)
			),
		}))
		.filter((group) => group.items.length > 0);
}

/** Sums all `items.length` values across the given groups. */
export function countGroupItems(groups: ConversationGroup[]): number {
	return groups.reduce((total, group) => total + group.items.length, 0);
}
