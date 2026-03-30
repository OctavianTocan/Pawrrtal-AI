'use client';

import { useEffect, useMemo, useState } from 'react';
import useGetConversations from '@/hooks/get-conversations';
import {
  buildConversationGroups,
  countGroupItems,
  filterConversationGroups,
} from '@/lib/conversation-groups';
import { ConversationDeleteDialog } from './ConversationDeleteDialog';
import { ConversationRenameDialog } from './ConversationRenameDialog';
import { NavChatsView } from './NavChatsView';
import { useConversationActions } from './UseConversationActions';
import { useDeleteConversation, useRenameConversation } from './UseConversationMutations';

/** localStorage key used to persist which date groups the user has collapsed. */
const COLLAPSED_GROUPS_STORAGE_KEY = 'nav-chats-collapsed-groups';

/**
 * Reads persisted collapsed group keys from localStorage.
 *
 * Wrapped in try/catch because storage reads can throw in private browsing
 * or when storage access is blocked by browser policy.
 */
function loadCollapsedGroups(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const storedGroups = window.localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
    if (!storedGroups) {
      return new Set();
    }

    const parsedGroups: unknown = JSON.parse(storedGroups);
    return new Set(Array.isArray(parsedGroups) ? parsedGroups : []);
  } catch {
    return new Set();
  }
}

/**
 * Container for the sidebar conversation list.
 *
 * Owns data fetching (conversations), search state, group computation,
 * collapsed-group persistence, navigation, and conversation rename/delete operations.
 * Delegates all rendering to `NavChatsView`.
 */
export function NavChats(): React.JSX.Element {
  const { data: conversations, isLoading } = useGetConversations();

  // --- search ---
  const [searchQuery, setSearchQuery] = useState('');
  const isSearchActive = searchQuery.trim().length >= 2;

  // --- grouping & filtering ---
  const groups = useMemo(() => buildConversationGroups(conversations ?? []), [conversations]);
  const filteredGroups = useMemo(
    () => filterConversationGroups(groups, searchQuery),
    [groups, searchQuery]
  );
  const resultCount = useMemo(() => countGroupItems(filteredGroups), [filteredGroups]);

  // --- collapsed state (persisted in localStorage) ---
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsedGroups);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        COLLAPSED_GROUPS_STORAGE_KEY,
        JSON.stringify([...collapsedGroups])
      );
    } catch {
      // Storage write failed (quota exceeded, private browsing, etc.) — ignore.
    }
  }, [collapsedGroups]);

  const toggleGroupCollapse = (groupKey: string): void => {
    setCollapsedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups);
      if (nextGroups.has(groupKey)) {
        nextGroups.delete(groupKey);
      } else {
        nextGroups.add(groupKey);
      }
      return nextGroups;
    });
  };

  // --- conversation actions ---
  const {
    renameDialogConversationId,
    deleteDialogConversationId,
    draftTitle,
    setDraftTitle,
    navigateTo,
    handleRenameClick,
    handleDeleteClick,
    handleRenameSubmit,
    handleDeleteConfirm,
    handleRenameDialogOpenChange,
    handleDeleteDialogOpenChange,
  } = useConversationActions(conversations);

  const renameConversationMutation = useRenameConversation();
  const deleteConversationMutation = useDeleteConversation();

  return (
    <>
      <NavChatsView
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClose={() => setSearchQuery('')}
        resultCount={resultCount}
        isLoading={isLoading}
        isEmpty={!conversations?.length}
        isSearchActive={isSearchActive}
        filteredGroups={filteredGroups}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroupCollapse}
        onNewSession={() => navigateTo('/')}
        onNavigate={navigateTo}
        onRename={handleRenameClick}
        onDelete={handleDeleteClick}
      />
      <ConversationRenameDialog
        isOpen={!!renameDialogConversationId}
        isPending={renameConversationMutation.isPending}
        draftTitle={draftTitle}
        onDraftTitleChange={setDraftTitle}
        onOpenChange={handleRenameDialogOpenChange}
        onSubmit={() => void handleRenameSubmit()}
      />
      <ConversationDeleteDialog
        isOpen={!!deleteDialogConversationId}
        isPending={deleteConversationMutation.isPending}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
