import { Calligraph } from 'calligraph';
import { Inbox, Search } from 'lucide-react';
import { Fragment } from 'react';
import { CollapsibleGroupHeader } from '@/components/collapsible-group-header';
import { ConversationSearchHeader } from '@/components/conversation-search-header';
import { ConversationSidebarItem } from '@/components/conversation-sidebar-item';
import { ConversationsEmptyState } from '@/components/conversations-empty-state';
import { SectionHeader } from '@/components/section-header';
import type { ConversationGroup } from '@/lib/conversation-groups';
import { highlightMatch } from '@/lib/highlight-match';

export interface NavChatsViewProps {
  /** Current search input value. */
  searchQuery: string;
  /** Called on every search keystroke. */
  onSearchChange: (query: string) => void;
  /** Called when the user clears the search. */
  onSearchClose: () => void;
  /** Total number of matching conversations. */
  resultCount: number;
  /** Whether conversations are still being fetched. */
  isLoading: boolean;
  /** Whether the data source returned zero conversations. */
  isEmpty: boolean;
  /** Whether the search query is long enough to filter (>= 2 chars). */
  isSearchActive: boolean;
  /** Date-grouped and search-filtered conversation buckets. */
  filteredGroups: ConversationGroup[];
  /** Set of group keys the user has collapsed. */
  collapsedGroups: Set<string>;
  /** Toggles a single group's collapsed state. */
  onToggleGroup: (groupKey: string) => void;
  /** Navigates to the root page to start a new session. */
  onNewSession: () => void;
}

/**
 * Pure presentation layer for the sidebar conversation list.
 *
 * Renders the search header, empty states, and grouped conversation items.
 * All data and callbacks are received via props — no hooks.
 */
export function NavChatsView({
  searchQuery,
  onSearchChange,
  onSearchClose,
  resultCount,
  isLoading,
  isEmpty,
  isSearchActive,
  filteredGroups,
  collapsedGroups,
  onToggleGroup,
  onNewSession,
}: NavChatsViewProps): React.JSX.Element {
  // --- content resolution ---
  // Computed outside JSX to avoid hard-to-read nested ternaries.
  let content: React.JSX.Element | null = null;

  if (isLoading) {
    content = null;
  } else if (isEmpty) {
    content = (
      <ConversationsEmptyState
        icon={<Inbox className="h-4 w-4" />}
        title="No sessions yet"
        description="Sessions with your agent appear here. Start one to get going."
        buttonLabel="New Session"
        onAction={onNewSession}
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
                    onToggle={() => onToggleGroup(group.key)}
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
        onSearchChange={onSearchChange}
        onSearchClose={onSearchClose}
        resultCount={resultCount}
      />
      {content}
    </div>
  );
}
