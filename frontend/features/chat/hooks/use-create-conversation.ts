import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/api";
import { useAuthedFetch } from "../../../hooks/use-authed-fetch";

/**
 * useCreateConversation is a hook that creates a new conversation.
 *
 * @returns A function that creates a new conversation.
 * @returns The conversation ID.
 */
export function useCreateConversation(conversationId: string) {
	const fetcher = useAuthedFetch();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["conversations"],
		mutationFn: async () => {
			const response = await fetcher(
				API_ENDPOINTS.conversations.create(conversationId),
				{
					method: "POST",
					body: JSON.stringify({}),
					headers: {
						"content-type": "application/json",
					},
				},
			);
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
		},
	});
}
