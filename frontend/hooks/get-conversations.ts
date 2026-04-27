import { API_ENDPOINTS } from '@/lib/api';
import type { Conversation } from '@/lib/types';
import { useAuthedQuery } from './use-authed-query';

/*
    Custom hook to get all conversations for the current user.
    @returns The conversations for the current user.
*/
export default function useGetConversations() {
  return useAuthedQuery<Conversation[]>(['conversations'], API_ENDPOINTS.conversations.list);
}
