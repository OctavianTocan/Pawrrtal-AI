'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { API_ENDPOINTS } from '@/lib/api';
import type { Conversation } from '@/lib/types';

interface RenameConversationVariables {
  conversationId: string;
  title: string;
}

interface DeleteConversationVariables {
  conversationId: string;
}

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

function removeConversation(
  conversations: Conversation[] | undefined,
  deletedConversationId: string
): Conversation[] | undefined {
  if (!conversations) {
    return conversations;
  }

  return conversations.filter((conversation) => conversation.id !== deletedConversationId);
}

export function useRenameConversation() {
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
      queryClient.setQueryData<Conversation[] | undefined>(['conversations'], (conversations) =>
        replaceConversation(conversations, updatedConversation)
      );
      queryClient.setQueryData<Conversation | undefined>(
        ['conversations', updatedConversation.id],
        updatedConversation
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
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
      queryClient.setQueryData<Conversation[] | undefined>(['conversations'], (conversations) =>
        removeConversation(conversations, deletedConversationId)
      );
      queryClient.removeQueries({ queryKey: ['conversations', deletedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
