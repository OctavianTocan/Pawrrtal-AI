/**
 * Constants for the projects feature.
 *
 * Keeps the localStorage key namespace + the mime type used by the
 * sidebar drag-and-drop in one place so renames don't drift across files.
 */

/** localStorage keys owned by the projects feature. */
export const PROJECTS_STORAGE_KEYS = {
	/** Set of project IDs the user has manually collapsed in the sidebar. */
	collapsedProjects: 'projects:collapsed',
} as const;

/** Union of every recognized projects `localStorage` key. */
export type ProjectsStorageKey = (typeof PROJECTS_STORAGE_KEYS)[keyof typeof PROJECTS_STORAGE_KEYS];

/**
 * MIME type used in the HTML5 drag-and-drop dataTransfer when a chat row
 * is being dragged onto a project. Custom string so the drop target can
 * tell our payload apart from arbitrary text/uri-list drags.
 */
export const CONVERSATION_DRAG_MIME = 'application/x-pawrrtal-conversation';
