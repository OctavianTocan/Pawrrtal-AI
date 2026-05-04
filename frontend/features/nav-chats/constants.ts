/**
 * Centralized constants for the nav-chats feature.
 *
 * Mirrors the pattern established by `features/chat/constants.ts`: a single
 * keys object for everything we persist to `localStorage`, plus any defaults
 * that more than one file in the feature would otherwise inline.
 */

// ─── localStorage keys ─────────────────────────────────────────────────────

/**
 * Single source of truth for every `localStorage` key the nav-chats feature
 * owns. Existing key strings are intentionally preserved verbatim — renaming
 * them would orphan every user's collapsed-group preferences.
 */
export const NAV_CHATS_STORAGE_KEYS = {
	/** Set of date-group keys the user has manually collapsed in the sidebar list. */
	collapsedGroups: 'nav-chats-collapsed-groups',
} as const;

/** Union of every recognized nav-chats `localStorage` key. */
export type NavChatsStorageKey =
	(typeof NAV_CHATS_STORAGE_KEYS)[keyof typeof NAV_CHATS_STORAGE_KEYS];
