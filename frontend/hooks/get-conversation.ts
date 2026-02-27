import { API_ENDPOINTS } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { useAuthedQuery } from "./use-authed-query";

/*
    Custom hook to get a conversation by ID.
    @param conversationId - The ID of the conversation to get.
    @returns The conversation.
*/
export default function useGetConversation(conversationId: string) {
	// Use the useAuthedQuery hook to fetch the conversation.
	// We keep conversationId in the query key to ensure that conversations are cached separately and updated correctly when the ID changes.
	return useAuthedQuery<Conversation>(
		["conversations", conversationId],
		API_ENDPOINTS.conversations.get(conversationId),
	);
}
