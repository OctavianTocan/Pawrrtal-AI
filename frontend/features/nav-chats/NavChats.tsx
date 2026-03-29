'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import useGetConversations from '@/hooks/get-conversations';
import {
  buildConversationGroups,
  countGroupItems,
  filterConversationGroups,
} from '@/lib/conversation-groups';
import { NavChatsView } from './NavChatsView';

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
 * collapsed-group persistence, and navigation. Delegates all rendering
 * to `NavChatsView`.
 */
export function NavChats(): React.JSX.Element {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: conversations, isLoading } = useGetConversations();

  // --- search ---
  const [searchQuery, setSearchQuery] = useState('');
  const isSearchActive = searchQuery.trim().length >= 2;

  // --- grouping & filtering ---
  // useMemo justified: buildConversationGroups sorts and groups conversations,
  // which is O(n log n). We memoize to avoid recomputing on every render.
  const groups = useMemo(() => buildConversationGroups(conversations ?? []), [conversations]);

  // useMemo justified: filterConversationGroups iterates all groups/items and
  // performs string matching. Memoizing avoids redundant filtering.
  const filteredGroups = useMemo(
    () => filterConversationGroups(groups, searchQuery),
    [groups, searchQuery]
  );

  // useMemo justified: countGroupItems is cheap, but filteredGroups is already
  // memoized, so we memoize this too for consistency and to avoid recounting.
  const resultCount = useMemo(() => countGroupItems(filteredGroups), [filteredGroups]);

  // --- collapsed state (persisted in localStorage) ---
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsedGroups);

  // useEffect justified: We need to synchronize collapsedGroups state with
  // localStorage whenever it changes. This is a side effect that can't be
  // done during render.
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

  /** Toggles the collapsed state for a single date-group key. */
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

  return (
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
      onNewSession={() => {
        if (isMobile) {
          setOpenMobile(false);
        }
        router.push('/');
      }}
    />
  );
}
