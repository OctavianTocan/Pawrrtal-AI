/**
 * Conversation drag-and-drop constants.
 *
 * @fileoverview Lives in `lib/` (not under any feature) because both
 * `features/nav-chats/` (drag source) and `features/projects/` (drop
 * target) need it. Putting it under either feature would create a
 * cross-feature edge.
 */

/**
 * MIME type used in the HTML5 drag-and-drop `dataTransfer` when a chat
 * row is being dragged onto a project. Custom string so the drop target
 * can tell our payload apart from arbitrary `text/uri-list` drags.
 */
export const CONVERSATION_DRAG_MIME = 'application/x-pawrrtal-conversation';
