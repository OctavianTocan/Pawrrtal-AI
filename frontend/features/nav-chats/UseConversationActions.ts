'use client';

import { usePathname, useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import type { Conversation } from '@/lib/types';
import { useDeleteConversation, useRenameConversation } from './UseConversationMutations';

interface UseConversationActionsResult {
  /** The ID of the conversation being renamed, or null if no dialog is open. */
  renameDialogConversationId: string | null;
  /** The ID of the conversation being deleted, or null if no dialog is open. */
  deleteDialogConversationId: string | null;
  /** The current draft title in the rename dialog. */
  draftTitle: string;
  /** Whether any mutation (rename or delete) is currently pending. */
  isMutating: boolean;
  /** Updates the draft title in the rename dialog. */
  setDraftTitle: (title: string) => void;
  /** Navigates to a URL and closes the mobile sidebar. */
  navigateTo: (target: string) => void;
  /** Opens the rename dialog for a conversation (guarded by isMutating). */
  handleRenameClick: (conversationId: string) => void;
  /** Opens the delete confirmation for a conversation (guarded by isMutating). */
  handleDeleteClick: (conversationId: string) => void;
  /** Submits the rename form, validating and calling the mutation. */
  handleRenameSubmit: () => Promise<void>;
  /** Confirms and executes the delete operation, navigating if needed. */
  handleDeleteConfirm: () => Promise<void>;
  /** Handles rename dialog open/close state changes. */
  handleRenameDialogOpenChange: (open: boolean) => void;
  /** Handles delete dialog open/close state changes. */
  handleDeleteDialogOpenChange: (open: boolean) => void;
}

/**
 * Hook to manage conversation rename and delete actions.
 *
 * Encapsulates dialog state, mutation calls, navigation, and mobile sidebar
 * closing logic. Prevents race conditions by tracking whether any mutation
 * is currently pending.
 */
export function useConversationActions(
  conversations: Conversation[] | undefined
): UseConversationActionsResult {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const renameConversationMutation = useRenameConversation();
  const deleteConversationMutation = useDeleteConversation();

  const [renameDialogConversationId, setRenameDialogConversationId] = useState<string | null>(null);
  const [deleteDialogConversationId, setDeleteDialogConversationId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const conversationBeingRenamed = conversations?.find(
    (conversation) => conversation.id === renameDialogConversationId
  );

  useEffect(() => {
    if (conversationBeingRenamed) {
      setDraftTitle(conversationBeingRenamed.title);
    }
  }, [conversationBeingRenamed]);

  const closeMobileSidebar = (): void => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navigateTo = (target: string): void => {
    closeMobileSidebar();
    startTransition(() => {
      router.push(target);
    });
  };

  const isMutating = renameConversationMutation.isPending || deleteConversationMutation.isPending;

  const handleRenameClick = (conversationId: string): void => {
    if (!isMutating) {
      setRenameDialogConversationId(conversationId);
    }
  };

  const handleDeleteClick = (conversationId: string): void => {
    if (!isMutating) {
      setDeleteDialogConversationId(conversationId);
    }
  };

  const handleRenameSubmit = async (): Promise<void> => {
    if (!renameDialogConversationId || !conversationBeingRenamed) {
      return;
    }

    const normalizedTitle = draftTitle.trim();
    if (!normalizedTitle || normalizedTitle === conversationBeingRenamed.title) {
      setRenameDialogConversationId(null);
      setDraftTitle('');
      return;
    }

    await renameConversationMutation.mutateAsync({
      conversationId: renameDialogConversationId,
      title: normalizedTitle,
    });
    setRenameDialogConversationId(null);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteDialogConversationId) {
      return;
    }

    await deleteConversationMutation.mutateAsync({
      conversationId: deleteDialogConversationId,
    });

    const wasSelected = pathname === `/c/${deleteDialogConversationId}`;
    setDeleteDialogConversationId(null);

    if (wasSelected) {
      navigateTo('/');
    }
  };

  const handleRenameDialogOpenChange = (open: boolean): void => {
    if (!open) {
      setRenameDialogConversationId(null);
      setDraftTitle('');
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean): void => {
    if (!open) {
      setDeleteDialogConversationId(null);
    }
  };

  return {
    renameDialogConversationId,
    deleteDialogConversationId,
    draftTitle,
    isMutating,
    setDraftTitle,
    navigateTo,
    handleRenameClick,
    handleDeleteClick,
    handleRenameSubmit,
    handleDeleteConfirm,
    handleRenameDialogOpenChange,
    handleDeleteDialogOpenChange,
  };
}
