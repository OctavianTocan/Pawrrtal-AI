/**
 * Formats a conversation timestamp into a compact relative-time string.
 *
 * Returns `"3s"`, `"45m"`, `"2h"`, `"5d"`, `"3w"`, `"6mo"`, or `"1y"`
 * depending on how long ago the timestamp is. Returns `null` for
 * unparseable dates.
 */
export function formatConversationAge(updatedAt: string): string | null {
	const date = new Date(updatedAt);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

	if (diffSeconds < 60) {
		return `${diffSeconds}s`;
	}

	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) {
		return `${diffMinutes}m`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours}h`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) {
		return `${diffDays}d`;
	}

	const diffWeeks = Math.floor(diffDays / 7);
	if (diffWeeks < 5) {
		return `${diffWeeks}w`;
	}

	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) {
		return `${Math.max(1, diffMonths)}mo`;
	}

	return `${Math.max(1, Math.floor(diffDays / 365))}y`;
}
