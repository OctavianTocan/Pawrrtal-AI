import type { ReactNode } from 'react';

/**
 * Wraps the first occurrence of `query` inside `text` with a highlight span,
 * then recurses on the remainder to catch subsequent matches.
 *
 * Returns the original string unchanged when `query` is empty or not found.
 *
 * @param text  - The full string to search within.
 * @param query - The substring to highlight (case-insensitive).
 */
export function highlightMatch(text: string, query: string): ReactNode {
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
