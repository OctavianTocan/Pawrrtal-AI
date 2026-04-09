'use client';

import { usePathname } from 'next/navigation';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useGetConversations from '@/hooks/get-conversations';
import { buildConversationGroups, countGroupItems } from '@/lib/conversation-groups';
import type { Conversation } from '@/lib/types';
import { ConversationDeleteDialog } from './ConversationDeleteDialog';
import { ConversationRenameDialog } from './ConversationRenameDialog';
import { useChatActivity } from './chat-activity-context';
import {
  clearMultiSelect,
  createInitialSelectionState,
  isMultiSelectActive,
  rangeSelect,
  singleSelect,
  toggleSelect,
} from './conversation-selection';
import { NavChatsView } from './NavChatsView';
import { useFocusZone, useSidebarFocusContext } from './sidebar-focus';
import { useConversationActions } from './UseConversationActions';
import { rankConversationsForSearch, useConversationSearch } from './use-conversation-search';

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

/** Extract the conversation UUID from a `/c/:id` pathname, or null if not on a conversation route. */
function extractConversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Container for the sidebar conversation list.
 *
 * Owns data fetching (conversations), search state, group computation,
 * collapsed-group persistence, navigation, conversation rename/delete operations,
 * multi-select functionality, and keyboard focus management.
 * Delegates all rendering to `NavChatsView`.
 */
export function NavChats(): React.JSX.Element {
  const { data: conversations, isLoading } = useGetConversations();
  const pathname = usePathname();
  const routeConversationId = extractConversationIdFromPath(pathname);
  const {
    conversationId: activeConversationId,
    chatHistory: activeChatHistory,
    isLoading: isChatLoading,
  } = useChatActivity();
  const { focusZone } = useSidebarFocusContext();
  /** Maps conversation IDs to their DOM elements for programmatic focus management. */
  const conversationElementRefs = useRef(new Map<string, HTMLDivElement>());

  // --- search ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- selection state ---
  const [selectionState, setSelectionState] = useState(createInitialSelectionState);

  // --- collapsed state (persisted in localStorage) ---
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsedGroups);

  // Merge real-time chat loading state into the conversation list so the sidebar
  // can show a spinner on the active conversation row without waiting for a refetch.
  const conversationsWithActivity = useMemo(
    () =>
      (conversations ?? []).map((conversation) =>
        conversation.id === activeConversationId
          ? { ...conversation, is_processing: conversation.is_processing || isChatLoading }
          : conversation
      ),
    [activeConversationId, conversations, isChatLoading]
  );

  const { contentSearchResults, activeChatMatchInfo, isSearchActive } = useConversationSearch({
    conversations: conversationsWithActivity,
    searchQuery,
    activeConversationId,
    activeChatHistory,
  });

  // --- grouping & filtering ---
  const baseGroups = useMemo(
    () => buildConversationGroups(conversationsWithActivity ?? []),
    [conversationsWithActivity]
  );

  // When searching, flatten results into a single "Matches" group sorted by relevance.
  // Otherwise use the default date-based grouping.
  const displayedGroups = useMemo(() => {
    if (!isSearchActive) {
      return baseGroups;
    }

    const matches = rankConversationsForSearch(
      conversationsWithActivity.filter((conversation) => contentSearchResults.has(conversation.id)),
      searchQuery,
      contentSearchResults
    );

    return [
      {
        key: 'search-results',
        label: 'Matches',
        items: matches,
      },
    ];
  }, [
    activeChatMatchInfo,
    baseGroups,
    contentSearchResults,
    conversationsWithActivity,
    isSearchActive,
    searchQuery,
  ]);

  // Flat list of conversation IDs currently visible in the DOM (respects collapsed groups).
  // Used for keyboard navigation index calculations and range-select boundaries.
  const visibleConversationIds = useMemo(
    () =>
      displayedGroups.flatMap((group) => {
        const isCollapsible = !isSearchActive && displayedGroups.length > 1;
        if (isCollapsible && collapsedGroups.has(group.key)) {
          return [];
        }

        return group.items.map((conversation) => conversation.id);
      }),
    [collapsedGroups, displayedGroups, isSearchActive]
  );

  // Resolve which conversation should appear focused: explicit selection > route > first visible.
  const focusedConversationId =
    selectionState.selected ?? routeConversationId ?? visibleConversationIds[0] ?? null;
  const { zoneRef, shouldMoveDOMFocus } = useFocusZone({
    zoneId: 'navigator',
    focusFirst: () => {
      const focusTargetId = focusedConversationId ?? visibleConversationIds[0];
      if (focusTargetId) {
        conversationElementRefs.current.get(focusTargetId)?.focus();
      }
    },
  });

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

  // Sync selection state when the route changes (e.g. user clicks a link or
  // navigates via browser back/forward). Skips when multi-select is active so
  // route changes from clicking a selected item don't collapse the selection.
  useEffect(() => {
    if (!routeConversationId) {
      return;
    }

    const routeIndex = visibleConversationIds.indexOf(routeConversationId);
    if (routeIndex >= 0 && !isMultiSelectActive(selectionState)) {
      setSelectionState((current) =>
        current.selected === routeConversationId && current.selectedIds.size === 1
          ? current
          : singleSelect(routeConversationId, routeIndex)
      );
    }
  }, [routeConversationId, selectionState, visibleConversationIds]);

  // Move DOM focus to the focused conversation when the focus-zone system
  // signals that a keyboard-initiated focus change occurred.
  useEffect(() => {
    if (!shouldMoveDOMFocus) {
      return;
    }

    const targetId = focusedConversationId ?? visibleConversationIds[0];
    if (targetId) {
      conversationElementRefs.current.get(targetId)?.focus();
    }
  }, [focusedConversationId, shouldMoveDOMFocus, visibleConversationIds]);

  const toggleGroupCollapse = useCallback((groupKey: string): void => {
    setCollapsedGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups);
      if (nextGroups.has(groupKey)) {
        nextGroups.delete(groupKey);
      } else {
        nextGroups.add(groupKey);
      }
      return nextGroups;
    });
  }, []);

  // --- conversation actions ---
  const {
    renameDialogConversationId,
    deleteDialogConversationId,
    draftTitle,
    isRenamePending,
    isDeletePending,
    setDraftTitle,
    navigateTo,
    handleRenameClick,
    handleDeleteClick,
    handleRenameSubmit,
    handleDeleteConfirm,
    handleRenameDialogOpenChange,
    handleDeleteDialogOpenChange,
  } = useConversationActions(conversations);

  /** Move DOM focus to the conversation at a given index in the visible list. */
  const focusConversationAtIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, visibleConversationIds.length - 1));
      const conversationId = visibleConversationIds[clampedIndex];
      if (!conversationId) {
        return;
      }

      conversationElementRefs.current.get(conversationId)?.focus();
    },
    [visibleConversationIds]
  );

  /** Select exactly one conversation and update the selection anchor. */
  const updateSingleSelection = useCallback((conversationId: string, index: number) => {
    setSelectionState(singleSelect(conversationId, index));
  }, []);

  /** Handle a normal click on a conversation row: select it, navigate to it. */
  const handleConversationClick = useCallback(
    (conversationId: string, index: number, href: string) => {
      focusZone('navigator', { intent: 'click', moveFocus: false });
      updateSingleSelection(conversationId, index);
      navigateTo(href);
    },
    [focusZone, navigateTo, updateSingleSelection]
  );

  /**
   * Handle mouseDown with modifier detection for multi-select.
   * - Right-click (button 2): add to selection if multi-select is active.
   * - Cmd/Ctrl+Click: toggle individual item.
   * - Shift+Click: range-select from anchor to target.
   * - Plain click: single-select (handled on click, not mouseDown).
   */
  const handleConversationMouseDown = useCallback(
    (event: ReactMouseEvent, conversationId: string, index: number) => {
      focusZone('navigator', { intent: 'click', moveFocus: false });

      if (event.button === 2) {
        setSelectionState((current) => {
          if (isMultiSelectActive(current) && !current.selectedIds.has(conversationId)) {
            return toggleSelect(current, conversationId, index);
          }
          return current;
        });
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        setSelectionState((current) => toggleSelect(current, conversationId, index));
        return;
      }

      if (event.shiftKey) {
        event.preventDefault();
        setSelectionState((current) => rangeSelect(current, index, visibleConversationIds));
        return;
      }

      updateSingleSelection(conversationId, index);
    },
    [focusZone, updateSingleSelection, visibleConversationIds]
  );

  /**
   * Keyboard navigation handler for the conversation list.
   * Arrow Up/Down: move focus. Shift+Arrow: extend range selection.
   * Arrow Left/Right: jump to sidebar/chat focus zones.
   * Cmd+A: select all. Escape: clear multi-select. Enter/Space: navigate.
   */
  const handleConversationKeyDown = useCallback(
    (event: ReactKeyboardEvent, conversation: Conversation, index: number) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusZone('sidebar', { intent: 'keyboard', moveFocus: true });
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusZone('chat', { intent: 'keyboard', moveFocus: true });
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        const firstConversationId = visibleConversationIds[0];
        const lastConversationId = visibleConversationIds[visibleConversationIds.length - 1];
        if (firstConversationId && lastConversationId) {
          setSelectionState({
            selected: lastConversationId,
            selectedIds: new Set(visibleConversationIds),
            anchorId: firstConversationId,
            anchorIndex: 0,
          });
        }
        return;
      }

      if (event.key === 'Escape' && isMultiSelectActive(selectionState)) {
        event.preventDefault();
        setSelectionState((current) => clearMultiSelect(current));
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleConversationClick(conversation.id, index, `/c/${conversation.id}`);
        return;
      }

      const moveToIndex =
        event.key === 'ArrowUp'
          ? index - 1
          : event.key === 'ArrowDown'
            ? index + 1
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? visibleConversationIds.length - 1
                : null;

      if (moveToIndex == null) {
        return;
      }

      event.preventDefault();
      const nextIndex = Math.max(0, Math.min(moveToIndex, visibleConversationIds.length - 1));
      const nextConversationId = visibleConversationIds[nextIndex];
      if (!nextConversationId) {
        return;
      }

      if (event.shiftKey) {
        setSelectionState((current) => rangeSelect(current, nextIndex, visibleConversationIds));
      } else {
        updateSingleSelection(nextConversationId, nextIndex);
      }

      focusConversationAtIndex(nextIndex);
    },
    [
      focusConversationAtIndex,
      focusZone,
      handleConversationClick,
      selectionState,
      updateSingleSelection,
      visibleConversationIds,
    ]
  );

  /** Ref callback to register/unregister a conversation row's DOM element for focus management. */
  const registerConversationElement = useCallback(
    (conversationId: string, element: HTMLDivElement | null) => {
      if (element) {
        conversationElementRefs.current.set(conversationId, element);
        return;
      }

      conversationElementRefs.current.delete(conversationId);
    },
    []
  );

  return (
    <>
      <NavChatsView
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClose={() => setSearchQuery('')}
        resultCount={countGroupItems(displayedGroups)}
        isLoading={isLoading}
        isEmpty={!conversationsWithActivity.length}
        isSearchActive={isSearchActive}
        filteredGroups={displayedGroups}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroupCollapse}
        onNewSession={() => navigateTo('/')}
        onNavigate={navigateTo}
        onRename={handleRenameClick}
        onDelete={handleDeleteClick}
        navigatorRef={zoneRef}
        contentSearchResults={contentSearchResults}
        activeChatMatchInfo={activeChatMatchInfo}
        multiSelectedIds={selectionState.selectedIds}
        focusedConversationId={focusedConversationId}
        onConversationClick={handleConversationClick}
        onConversationMouseDown={handleConversationMouseDown}
        onConversationKeyDown={handleConversationKeyDown}
        registerConversationElement={registerConversationElement}
        onNavigatorMouseDown={() => focusZone('navigator', { intent: 'click', moveFocus: false })}
      />
      <ConversationRenameDialog
        isOpen={!!renameDialogConversationId}
        isPending={isRenamePending}
        draftTitle={draftTitle}
        onDraftTitleChange={setDraftTitle}
        onOpenChange={handleRenameDialogOpenChange}
        onSubmit={() => void handleRenameSubmit()}
      />
      <ConversationDeleteDialog
        isOpen={!!deleteDialogConversationId}
        isPending={isDeletePending}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
