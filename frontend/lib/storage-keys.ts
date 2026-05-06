/**
 * Cross-cutting `localStorage` keys used by app-wide UI primitives.
 *
 * Feature-scoped keys live next to the feature they belong to (e.g.
 * `features/chat/constants.ts`, `features/nav-chats/constants.ts`); this file
 * is the home for keys owned by shared `components/ui/*` primitives that don't
 * belong to any single feature.
 *
 * Conventions:
 * - Group related keys into a single `<NAMESPACE>_STORAGE_KEYS` object so
 *   renames stay safe and grep-able.
 * - Existing key strings are intentionally preserved verbatim — changing them
 *   would orphan every existing user's persisted preference.
 */

/** localStorage keys owned by the resizable/collapsible sidebar primitive. */
export const SIDEBAR_STORAGE_KEYS = {
	/** Whether the desktop sidebar is currently expanded or collapsed. */
	state: 'sidebar_state',
	/** User-customized desktop sidebar width in pixels. */
	width: 'sidebar_width',
} as const;

/** Union of every recognized sidebar `localStorage` key. */
export type SidebarStorageKey = (typeof SIDEBAR_STORAGE_KEYS)[keyof typeof SIDEBAR_STORAGE_KEYS];
