'use client';

import type { Conversation, ConversationStatus } from '@/lib/types';
import { useRegenerateTitle, useUpdateConversationMetadata } from './use-conversation-mutations';

/** Action handlers returned by {@link useConversationMetadataActions}. */
export interface UseConversationMetadataActionsResult {
	/** Toggles the archived state of a conversation. */
	handleArchive: (conversationId: string) => void;
	/** Toggles the flagged state of a conversation. */
	handleFlag: (conversationId: string) => void;
	/** Sets the status tag on a conversation. */
	handleSetStatus: (conversationId: string, status: ConversationStatus) => void;
	/** Toggles the unread indicator on a conversation. */
	handleMarkUnread: (conversationId: string) => void;
	/** Triggers LLM-based title regeneration for a conversation. */
	handleRegenerateTitle: (conversationId: string) => void;
}

/**
 * Hook providing archive, flag, status, unread, and regenerate-title actions.
 *
 * Extracted from `useConversationActions` to keep that hook under the line limit.
 * Each handler fires a PATCH mutation — no local dialog state is needed.
 */
export function useConversationMetadataActions(
	conversations: Conversation[] | undefined
): UseConversationMetadataActionsResult {
	const updateMetadataMutation = useUpdateConversationMetadata();
	const regenerateTitleMutation = useRegenerateTitle();

	const handleArchive = (conversationId: string): void => {
		const conversation = conversations?.find((c) => c.id === conversationId);
		if (!conversation) return;
		void updateMetadataMutation.mutateAsync({
			conversationId,
			is_archived: !conversation.is_archived,
		});
	};

	const handleFlag = (conversationId: string): void => {
		const conversation = conversations?.find((c) => c.id === conversationId);
		if (!conversation) return;
		void updateMetadataMutation.mutateAsync({
			conversationId,
			is_flagged: !conversation.is_flagged,
		});
	};

	const handleSetStatus = (conversationId: string, status: ConversationStatus): void => {
		void updateMetadataMutation.mutateAsync({ conversationId, status });
	};

	const handleMarkUnread = (conversationId: string): void => {
		const conversation = conversations?.find((c) => c.id === conversationId);
		if (!conversation) return;
		void updateMetadataMutation.mutateAsync({
			conversationId,
			is_unread: !conversation.is_unread,
		});
	};

	const handleRegenerateTitle = (conversationId: string): void => {
		void regenerateTitleMutation.mutateAsync({ conversationId });
	};

	return {
		handleArchive,
		handleFlag,
		handleSetStatus,
		handleMarkUnread,
		handleRegenerateTitle,
	};
}
