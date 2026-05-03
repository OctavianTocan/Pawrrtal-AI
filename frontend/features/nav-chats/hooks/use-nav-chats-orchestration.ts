/**
 * Sidebar conversation list behavior: search, multi-select, keyboard nav, and focus zones.
 *
 * @fileoverview Feeds {@link NavChatsView} with handlers derived from route, groups, and collapse state.
 */

'use client';

import { usePathname } from 'next/navigation';
import type {
  Dispatch,
  MutableRefObject,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConversationGroup } from '@/lib/conversation-groups';
import { extractConversationIdFromPath } from '@/lib/route-utils';
import type { Conversation } from '@/lib/types';
import type { NavChatsViewProps } from '../components/NavChatsView';
import { useOptionalSidebarFocusContext } from '../context/sidebar-focus';
import {
  createInitialSelectionState,
  type MultiSelectState,
  rangeSelect,
  singleSelect,
  toggleSelect,
} from '../lib/conversation-selection';
import { useConversationSearch } from './use-conversation-search';

type OptionalSidebarFocus = ReturnType<typeof useOptionalSidebarFocusContext>;

/**
 * Parses a conversation id from a Next.js pathname like `/c/<id>`, or `null` if
 * the route is not a single-conversation view.
 */
function getConversationIdFromPathname(pathname: string | null): string | null {
  if (!pathname) {
    return null;
  }
  return extractConversationIdFromPath(pathname);
}

/**
 * Builds a flat, visible-order list of conversation ids from grouped data,
 * matching the list rendering rules in `NavChatsView` (collapse + search).
 */
function buildVisibleConversationIdOrder(
  isSearchActive: boolean,
  filteredGroups: ConversationGroup[],
  collapsedGroups: Set<string>
): string[] {
  const canCollapse = !isSearchActive && filteredGroups.length > 1;
  const collapsedKeys = canCollapse ? collapsedGroups : new Set<string>();
  const ids: string[] = [];

  for (const group of filteredGroups) {
    if (collapsedKeys.has(group.key)) {
      continue;
    }
    for (const conversation of group.items) {
      ids.push(conversation.id);
    }
  }

  return ids;
}

function usePathnameSelectionSync(
  pathConversationId: string | null,
  flatOrderIds: string[],
  setSelection: Dispatch<SetStateAction<MultiSelectState>>
): void {
  useEffect(() => {
    if (!pathConversationId) {
      setSelection(createInitialSelectionState());
      return;
    }

    const index = flatOrderIds.indexOf(pathConversationId);
    if (index >= 0) {
      setSelection(singleSelect(pathConversationId, index));
      return;
    }

    setSelection({
      selected: pathConversationId,
      selectedIds: new Set([pathConversationId]),
      anchorId: pathConversationId,
      anchorIndex: -1,
    });
  }, [pathConversationId, flatOrderIds, setSelection]);
}

/**
 * @returns Keyboard handler for roving list navigation, Tab zone escape, and Home/End.
 */
function createNavChatsListKeydownHandler(options: {
  flatOrderIds: string[];
  navigateTo: (href: string) => void;
  setSelection: Dispatch<SetStateAction<MultiSelectState>>;
  conversationElements: MutableRefObject<Map<string, HTMLDivElement>>;
  focus: OptionalSidebarFocus;
}): (event: ReactKeyboardEvent, _conversation: Conversation, index: number) => void {
  const { flatOrderIds, navigateTo, setSelection, conversationElements, focus } = options;
  return (event, _conversation, index) => {
    if (event.key === 'Tab' && !event.shiftKey) {
      focus?.focusNextZone();
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab' && event.shiftKey) {
      focus?.focusPreviousZone();
      event.preventDefault();
      return;
    }

    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }
    if (flatOrderIds.length === 0) {
      return;
    }

    event.preventDefault();
    const currentIndex = index;

    const moveTo = (nextIndex: number): void => {
      const safeIndex = Math.max(0, Math.min(flatOrderIds.length - 1, nextIndex));
      const id = flatOrderIds[safeIndex];
      if (!id) {
        return;
      }
      setSelection(singleSelect(id, safeIndex));
      navigateTo(`/c/${id}`);
      const element = conversationElements.current.get(id);
      queueMicrotask(() => element?.focus());
    };

    if (event.key === 'Home') {
      moveTo(0);
      return;
    }
    if (event.key === 'End') {
      moveTo(flatOrderIds.length - 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      moveTo(currentIndex - 1);
      return;
    }
    moveTo(currentIndex + 1);
  };
}

/**
 * Centralizes the sidebar list behavior required by `NavChatsView`: content
 * search, multi-select, keyboard navigation, and (optional) focus-zone hooks.
 */
export function useNavChatsOrchestration(input: {
  /** Raw conversation list; may be undefined while loading. */
  conversations: Conversation[] | undefined;
  /** Uncontrolled search input. */
  searchQuery: string;
  /** Grouped, filtered list passed to the view. */
  filteredGroups: ConversationGroup[];
  /** Collapse state for each date group. */
  collapsedGroups: Set<string>;
  /** Route navigation and mobile sidebar close (from `useConversationActions`). */
  navigateTo: (href: string) => void;
}): Pick<
  NavChatsViewProps,
  | 'navigatorRef'
  | 'contentSearchResults'
  | 'activeChatMatchInfo'
  | 'multiSelectedIds'
  | 'focusedConversationId'
  | 'onConversationClick'
  | 'onConversationMouseDown'
  | 'onConversationKeyDown'
  | 'registerConversationElement'
  | 'onNavigatorMouseDown'
  | 'isSearchActive'
> {
  const { conversations, searchQuery, filteredGroups, collapsedGroups, navigateTo } = input;
  const conversationList = conversations ?? [];
  const pathname = usePathname();
  const pathConversationId = getConversationIdFromPathname(pathname);
  const sidebarFocus = useOptionalSidebarFocusContext();

  const { contentSearchResults, activeChatMatchInfo, isSearchActive } = useConversationSearch({
    conversations: conversationList,
    searchQuery,
    activeConversationId: pathConversationId,
  });

  const flatOrderIds = useMemo(
    () => buildVisibleConversationIdOrder(isSearchActive, filteredGroups, collapsedGroups),
    [isSearchActive, filteredGroups, collapsedGroups]
  );

  const [selection, setSelection] = useState<MultiSelectState>(createInitialSelectionState);
  const navigatorRef = useRef<HTMLDivElement | null>(null);
  const conversationElements = useRef(new Map<string, HTMLDivElement>());
  const pendingModifier = useRef<'none' | 'meta' | 'shift'>('none');

  usePathnameSelectionSync(pathConversationId, flatOrderIds, setSelection);

  const onNavigatorMouseDown = useCallback((): void => {
    sidebarFocus?.focusZone('navigator', { intent: 'click' });
  }, [sidebarFocus]);

  const registerConversationElement = useCallback(
    (conversationId: string, element: HTMLDivElement | null): void => {
      if (element) {
        conversationElements.current.set(conversationId, element);
      } else {
        conversationElements.current.delete(conversationId);
      }
    },
    []
  );

  const onConversationMouseDown = useCallback(
    (event: ReactMouseEvent, conversationId: string, index: number): void => {
      onNavigatorMouseDown();
      if (event.shiftKey) {
        setSelection((current) => rangeSelect(current, index, flatOrderIds));
        pendingModifier.current = 'shift';
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        setSelection((current) => toggleSelect(current, conversationId, index));
        pendingModifier.current = 'meta';
        return;
      }

      pendingModifier.current = 'none';
    },
    [flatOrderIds, onNavigatorMouseDown]
  );

  const onConversationClick = useCallback(
    (conversationId: string, index: number, href: string): void => {
      const modifier = pendingModifier.current;
      pendingModifier.current = 'none';
      if (modifier === 'meta') {
        return;
      }
      if (modifier === 'shift') {
        navigateTo(href);
        return;
      }
      setSelection(singleSelect(conversationId, index));
      navigateTo(href);
    },
    [navigateTo]
  );

  const onConversationKeyDown = useMemo(
    () =>
      createNavChatsListKeydownHandler({
        flatOrderIds,
        navigateTo,
        setSelection,
        conversationElements,
        focus: sidebarFocus,
      }),
    [flatOrderIds, navigateTo, sidebarFocus]
  );

  return {
    navigatorRef,
    contentSearchResults,
    activeChatMatchInfo,
    multiSelectedIds: selection.selectedIds,
    focusedConversationId: selection.selected,
    onConversationClick,
    onConversationMouseDown,
    onConversationKeyDown,
    registerConversationElement,
    onNavigatorMouseDown,
    isSearchActive,
  };
}
