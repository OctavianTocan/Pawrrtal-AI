'use client';

import { usePathname } from 'next/navigation';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useGetConversations from '@/hooks/get-conversations';
import type { ConversationGroup } from '@/lib/conversation-groups';
import { buildConversationGroups, countGroupItems } from '@/lib/conversation-groups';
import type { Conversation } from '@/lib/types';
import { ConversationDeleteDialog } from './ConversationDeleteDialog';
import { ConversationRenameDialog } from './ConversationRenameDialog';
import { useChatActivity } from './chat-activity-context';
import type { MultiSelectState } from './conversation-selection';
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
import type { ContentSearchResult } from './use-conversation-search';
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

// ---------------------------------------------------------------------------
// Extracted hooks — keep NavChats itself under the 120-line Biome limit.
// ---------------------------------------------------------------------------

/**
 * Manages collapsed group state with localStorage persistence.
 * Returns the current collapsed set and a toggle callback.
 */
function useCollapsedGroups() {
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

  return { collapsedGroups, toggleGroupCollapse };
}

/**
 * Derives grouped and filtered conversation lists from raw conversations.
 *
 * When a search is active the conversations are flattened into a single
 * "Matches" group sorted by relevance. Otherwise date-based grouping is used.
 * Also computes the flat list of visible conversation IDs (respecting collapsed groups).
 */
function useConversationGrouping(
  conversationsWithActivity: Conversation[],
  isSearchActive: boolean,
  searchQuery: string,
  contentSearchResults: Map<string, ContentSearchResult>,
  collapsedGroups: Set<string>
) {
  const baseGroups = useMemo(
    () => buildConversationGroups(conversationsWithActivity ?? []),
    [conversationsWithActivity]
  );

  // When searching, flatten results into a single "Matches" group sorted by relevance.
  // Otherwise use the default date-based grouping.
  const displayedGroups: ConversationGroup[] = useMemo(() => {
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
  }, [baseGroups, contentSearchResults, conversationsWithActivity, isSearchActive, searchQuery]);

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

  return { displayedGroups, visibleConversationIds };
}

/**
 * Syncs selection state when the route changes (e.g. user clicks a link or
 * navigates via browser back/forward). Skips when multi-select is active so
 * route changes from clicking a selected item don't collapse the selection.
 */
function useRouteSelectionSync(
  routeConversationId: string | null,
  visibleConversationIds: string[],
  selectionState: MultiSelectState,
  setSelectionState: React.Dispatch<React.SetStateAction<MultiSelectState>>
) {
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
  }, [routeConversationId, selectionState, visibleConversationIds, setSelectionState]);
}

/**
 * Manages the focus-zone registration and DOM focus synchronisation for the
 * conversation navigator. Returns the zone ref, focused ID, and element
 * registration callback.
 */
function useFocusManagement(
  selectionState: MultiSelectState,
  routeConversationId: string | null,
  visibleConversationIds: string[]
) {
  /** Maps conversation IDs to their DOM elements for programmatic focus management. */
  const conversationElementRefs = useRef(new Map<string, HTMLDivElement>());

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

  return {
    zoneRef,
    focusedConversationId,
    focusConversationAtIndex,
    registerConversationElement,
  };
}

// ---------------------------------------------------------------------------
// Keyboard handler helpers — extracted to reduce cognitive complexity of
// handleConversationKeyDown below the Biome threshold (max 20).
// ---------------------------------------------------------------------------

/** Handle ArrowLeft: move focus to the sidebar zone. */
function handleArrowLeft(
  event: ReactKeyboardEvent,
  focusZone: ReturnType<typeof useSidebarFocusContext>['focusZone']
) {
  event.preventDefault();
  focusZone('sidebar', { intent: 'keyboard', moveFocus: true });
}

/** Handle ArrowRight: move focus to the chat zone. */
function handleArrowRight(
  event: ReactKeyboardEvent,
  focusZone: ReturnType<typeof useSidebarFocusContext>['focusZone']
) {
  event.preventDefault();
  focusZone('chat', { intent: 'keyboard', moveFocus: true });
}

/** Handle Cmd/Ctrl+A: select all visible conversations. */
function handleSelectAll(
  event: ReactKeyboardEvent,
  visibleConversationIds: string[],
  setSelectionState: React.Dispatch<React.SetStateAction<MultiSelectState>>
) {
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
}

/** Handle Escape: clear multi-select when active. Returns true if handled. */
function handleEscape(
  event: ReactKeyboardEvent,
  selectionState: MultiSelectState,
  setSelectionState: React.Dispatch<React.SetStateAction<MultiSelectState>>
): boolean {
  if (!isMultiSelectActive(selectionState)) {
    return false;
  }
  event.preventDefault();
  setSelectionState((current) => clearMultiSelect(current));
  return true;
}

/** Handle Enter/Space: navigate to the conversation. */
function handleActivate(
  event: ReactKeyboardEvent,
  conversation: Conversation,
  index: number,
  onClick: (id: string, idx: number, href: string) => void
) {
  event.preventDefault();
  onClick(conversation.id, index, `/c/${conversation.id}`);
}

/**
 * Resolves a movement key to the target index, or null if the key isn't a movement key.
 * Covers ArrowUp, ArrowDown, Home, and End.
 */
function resolveMovementIndex(key: string, currentIndex: number, maxIndex: number): number | null {
  switch (key) {
    case 'ArrowUp':
      return currentIndex - 1;
    case 'ArrowDown':
      return currentIndex + 1;
    case 'Home':
      return 0;
    case 'End':
      return maxIndex;
    default:
      return null;
  }
}

/**
 * Encapsulates selection state and all conversation interaction handlers
 * (click, mouseDown, keyDown). Keeps NavChats under the line-count limit.
 */
function useConversationInteraction(
  focusZone: ReturnType<typeof useSidebarFocusContext>['focusZone'],
  navigateTo: (href: string) => void,
  visibleConversationIds: string[],
  focusConversationAtIndex: (index: number) => void,
  selectionState: MultiSelectState,
  setSelectionState: React.Dispatch<React.SetStateAction<MultiSelectState>>
) {
  /** Select exactly one conversation and update the selection anchor. */
  const updateSingleSelection = useCallback(
    (conversationId: string, index: number) => {
      setSelectionState(singleSelect(conversationId, index));
    },
    [setSelectionState]
  );

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
    [focusZone, setSelectionState, updateSingleSelection, visibleConversationIds]
  );

  /**
   * Keyboard navigation handler for the conversation list.
   *
   * Delegates to extracted helper functions per key to keep cognitive complexity
   * under the Biome threshold. Arrow Up/Down move focus; Shift+Arrow extends
   * range selection; Arrow Left/Right jump focus zones; Cmd+A selects all;
   * Escape clears multi-select; Enter/Space navigates.
   */
  const handleConversationKeyDown = useCallback(
    (event: ReactKeyboardEvent, conversation: Conversation, index: number) => {
      const { key } = event;

      if (key === 'ArrowLeft') {
        return handleArrowLeft(event, focusZone);
      }
      if (key === 'ArrowRight') {
        return handleArrowRight(event, focusZone);
      }
      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'a') {
        return handleSelectAll(event, visibleConversationIds, setSelectionState);
      }
      if (key === 'Escape') {
        handleEscape(event, selectionState, setSelectionState);
        return;
      }
      if (key === 'Enter' || key === ' ') {
        return handleActivate(event, conversation, index, handleConversationClick);
      }

      const moveToIndex = resolveMovementIndex(key, index, visibleConversationIds.length - 1);
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
      setSelectionState,
      updateSingleSelection,
      visibleConversationIds,
    ]
  );

  return {
    handleConversationClick,
    handleConversationMouseDown,
    handleConversationKeyDown,
  };
}

/** Renders the rename + delete confirmation dialogs for conversation management. */
function ConversationDialogs({
  renameDialogConversationId,
  deleteDialogConversationId,
  draftTitle,
  isRenamePending,
  isDeletePending,
  setDraftTitle,
  handleRenameDialogOpenChange,
  handleDeleteDialogOpenChange,
  handleRenameSubmit,
  handleDeleteConfirm,
}: {
  renameDialogConversationId: string | null;
  deleteDialogConversationId: string | null;
  draftTitle: string;
  isRenamePending: boolean;
  isDeletePending: boolean;
  setDraftTitle: (title: string) => void;
  handleRenameDialogOpenChange: (open: boolean) => void;
  handleDeleteDialogOpenChange: (open: boolean) => void;
  handleRenameSubmit: () => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
}) {
  return (
    <>
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
  const [searchQuery, setSearchQuery] = useState('');
  const { collapsedGroups, toggleGroupCollapse } = useCollapsedGroups();

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

  const { displayedGroups, visibleConversationIds } = useConversationGrouping(
    conversationsWithActivity,
    isSearchActive,
    searchQuery,
    contentSearchResults,
    collapsedGroups
  );

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

  const [selectionState, setSelectionState] = useState(createInitialSelectionState);

  // --- focus management ---
  const { zoneRef, focusedConversationId, focusConversationAtIndex, registerConversationElement } =
    useFocusManagement(selectionState, routeConversationId, visibleConversationIds);

  // --- interaction handlers (click, mouseDown, keyDown) ---
  const { handleConversationClick, handleConversationMouseDown, handleConversationKeyDown } =
    useConversationInteraction(
      focusZone,
      navigateTo,
      visibleConversationIds,
      focusConversationAtIndex,
      selectionState,
      setSelectionState
    );

  // --- route sync ---
  useRouteSelectionSync(
    routeConversationId,
    visibleConversationIds,
    selectionState,
    setSelectionState
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
      <ConversationDialogs
        renameDialogConversationId={renameDialogConversationId}
        deleteDialogConversationId={deleteDialogConversationId}
        draftTitle={draftTitle}
        isRenamePending={isRenamePending}
        isDeletePending={isDeletePending}
        setDraftTitle={setDraftTitle}
        handleRenameDialogOpenChange={handleRenameDialogOpenChange}
        handleDeleteDialogOpenChange={handleDeleteDialogOpenChange}
        handleRenameSubmit={handleRenameSubmit}
        handleDeleteConfirm={handleDeleteConfirm}
      />
    </>
  );
}
