'use client';

import { Calligraph } from 'calligraph';
import { Inbox, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { CollapsibleGroupHeader } from '@/components/collapsible-group-header';
import { ConversationSearchHeader } from '@/components/conversation-search-header';
import { ConversationSidebarItem } from '@/components/conversation-sidebar-item';
import { ConversationsEmptyState } from '@/components/conversations-empty-state';
import { SectionHeader } from '@/components/section-header';
import useGetConversations from '@/hooks/get-conversations';
import {
  buildConversationGroups,
  countGroupItems,
  filterConversationGroups,
} from '@/lib/conversation-groups';
import { highlightMatch } from '@/lib/highlight-match';

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
 * Sidebar conversation list with search, date grouping, and collapsible sections.
 *
 * Conversations are grouped by calendar day (newest-first). Groups with more
 * than one section support collapse/expand; collapsed state is persisted in
 * localStorage. A search bar filters by title once the query reaches 2+ chars.
 */
export function NavChats(): React.JSX.Element {
  const router = useRouter();
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

  // Persist collapsed groups whenever they change.
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

  // --- content resolution ---
  // Computed outside JSX to avoid hard-to-read nested ternaries.
  let content: React.JSX.Element | null = null;

  if (isLoading) {
    content = null;
  } else if (!conversations?.length) {
    content = (
      <ConversationsEmptyState
        icon={<Inbox className="h-4 w-4" />}
        title="No sessions yet"
        description="Sessions with your agent appear here. Start one to get going."
        buttonLabel="New Session"
        onAction={() => router.push('/')}
      />
    );
  } else if (isSearchActive && resultCount === 0) {
    content = (
      <ConversationsEmptyState
        icon={<Search className="h-4 w-4" />}
        title="No matching sessions"
        description="Try a different title fragment. Search lights up once you have at least two characters."
      />
    );
  } else {
    content = (
      <div className="pt-1">
        <ul className="flex w-full min-w-0 flex-col gap-0">
          {filteredGroups.map((group) => {
            // Only allow collapsing when there are multiple groups and
            // the user is not searching (search always shows all matches).
            const isCollapsible = !isSearchActive && filteredGroups.length > 1;

            // Gate on isCollapsible so a persisted key can't hide items
            // when only one group remains.
            const isCollapsed = isCollapsible && collapsedGroups.has(group.key);

            return (
              <Fragment key={group.key}>
                {isCollapsible ? (
                  <CollapsibleGroupHeader
                    label={group.label}
                    isCollapsed={isCollapsed}
                    itemCount={group.items.length}
                    onToggle={() => toggleGroupCollapse(group.key)}
                  />
                ) : (
                  <SectionHeader label={group.label} />
                )}
                {isCollapsed
                  ? null
                  : group.items.map((conversation, index) => (
                      <ConversationSidebarItem
                        key={conversation.id}
                        id={conversation.id}
                        title={
                          isSearchActive ? (
                            highlightMatch(conversation.title, searchQuery)
                          ) : (
                            <Calligraph>{conversation.title}</Calligraph>
                          )
                        }
                        ariaLabel={conversation.title}
                        updatedAt={conversation.updated_at}
                        showSeparator={index > 0}
                      />
                    ))}
              </Fragment>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConversationSearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClose={() => setSearchQuery('')}
        resultCount={resultCount}
      />
      {content}
    </div>
  );
}
