import { API_ENDPOINTS } from '@/lib/api';
import type { Conversation } from '@/lib/types';
import { useAuthedQuery } from './use-authed-query';

/**
 * Fetches a single conversation by id (`GET /api/v1/conversations/:id`).
 *
 * @param conversationId - UUID of the conversation; included in the React Query cache key.
 */
export default function useGetConversation(conversationId: string) {
	// conversationId in queryKey keeps per-conversation cache entries distinct when navigating.
	return useAuthedQuery<Conversation>(
		['conversations', conversationId],
		API_ENDPOINTS.conversations.get(conversationId)
	);
}
