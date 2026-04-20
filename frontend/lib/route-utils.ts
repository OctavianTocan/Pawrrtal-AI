/**
 * Route-related utility functions.
 *
 * @fileoverview Pure helpers for extracting data from URL pathnames.
 */

/**
 * Extract the conversation UUID from a `/c/:id` pathname.
 *
 * @returns The conversation ID, or null if the pathname doesn't match.
 */
export function extractConversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/]+)/);
  return match?.[1] ?? null;
}
