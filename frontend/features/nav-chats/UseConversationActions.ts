'use client';

import { usePathname, useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import type { Conversation } from '@/lib/types';
import { useDeleteConversation, useRenameConversation } from './UseConversationMutations';

interface UseConversationActionsResult {
  renameDialogConversationId: string | null;
  deleteDialogConversationId: string | null;
  draftTitle: string;
  isMutating: boolean;
  setDraftTitle: (title: string) => void;
  navigateTo: (target: string) => void;
  handleRenameClick: (conversationId: string) => void;
  handleDeleteClick: (conversationId: string) => void;
  handleRenameSubmit: () => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  handleRenameDialogOpenChange: (open: boolean) => void;
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
