/**
 * Rename and delete conversation mutations with React Query cache updates.
 *
 * @fileoverview Duplicate of the rename/delete hooks in `hooks/use-conversation-mutations.ts`.
 * The app imports from the hooks path; this file is currently unused.
 */

import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { API_ENDPOINTS } from '@/lib/api';
import type { Conversation } from '@/lib/types';

/** Variables required to rename a conversation. */
interface RenameConversationVariables {
	conversationId: string;
	title: string;
}

/** Variables required to delete a conversation. */
interface DeleteConversationVariables {
	conversationId: string;
}

/**
 * Replaces a conversation in the query cache with an updated version.
 *
 * Used as an optimistic cache update after a successful rename mutation.
 * Returns the same array reference if conversations is undefined.
 */
function replaceConversation(
	conversations: Conversation[] | undefined,
	updatedConversation: Conversation
): Conversation[] | undefined {
	if (!conversations) {
		return conversations;
	}

	return conversations.map((conversation) =>
		conversation.id === updatedConversation.id ? updatedConversation : conversation
	);
}

/**
 * Removes a conversation from the query cache.
 *
 * Used as an optimistic cache update after a successful delete mutation.
 * Returns the same array reference if conversations is undefined.
 */
function removeConversation(
	conversations: Conversation[] | undefined,
	deletedConversationId: string
): Conversation[] | undefined {
	if (!conversations) {
		return conversations;
	}

	return conversations.filter((conversation) => conversation.id !== deletedConversationId);
}

/**
 * React Query mutation hook for renaming a conversation.
 *
 * Sends a PATCH request to update the conversation title, then optimistically
 * updates both the conversations list cache and the individual conversation cache.
 * Triggers a background refetch to ensure consistency with the server.
 *
 * @returns A mutation object with `mutate` and `mutateAsync` methods.
 */
export function useRenameConversation(): UseMutationResult<
	Conversation,
	Error,
	RenameConversationVariables
> {
	const fetcher = useAuthedFetch();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['conversations', 'rename'],
		mutationFn: async ({ conversationId, title }: RenameConversationVariables) => {
			const response = await fetcher(API_ENDPOINTS.conversations.update(conversationId), {
				method: 'PATCH',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify({ title }),
			});

			return (await response.json()) as Conversation;
		},
		onSuccess: (updatedConversation) => {
			queryClient.setQueryData<Conversation[] | undefined>(
				['conversations'],
				(conversations) => replaceConversation(conversations, updatedConversation)
			);
			queryClient.setQueryData<Conversation | undefined>(
				['conversations', updatedConversation.id],
				updatedConversation
			);
			queryClient.invalidateQueries({ queryKey: ['conversations'] });
		},
	});
}

/**
 * React Query mutation hook for deleting a conversation.
 *
 * Sends a DELETE request to remove the conversation from the server, then
 * optimistically removes it from the conversations list cache and removes
 * the individual conversation cache entry. Triggers a background refetch
 * to ensure consistency with the server.
 *
 * @returns A mutation object with `mutate` and `mutateAsync` methods.
 */
export function useDeleteConversation(): UseMutationResult<
	string,
	Error,
	DeleteConversationVariables
> {
	const fetcher = useAuthedFetch();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['conversations', 'delete'],
		mutationFn: async ({ conversationId }: DeleteConversationVariables) => {
			await fetcher(API_ENDPOINTS.conversations.delete(conversationId), {
				method: 'DELETE',
			});

			return conversationId;
		},
		onSuccess: (deletedConversationId) => {
			queryClient.setQueryData<Conversation[] | undefined>(
				['conversations'],
				(conversations) => removeConversation(conversations, deletedConversationId)
			);
			queryClient.removeQueries({ queryKey: ['conversations', deletedConversationId] });
			queryClient.invalidateQueries({ queryKey: ['conversations'] });
		},
	});
}
