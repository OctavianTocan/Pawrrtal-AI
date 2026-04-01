import { Calligraph } from 'calligraph';
import { Inbox, LoaderCircle, Search, ShieldAlert, Triangle } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import type { ConversationGroup } from '@/lib/conversation-groups';
import type { Conversation } from '@/lib/types';
import { highlightMatch } from '@/lib/highlight-match';
import { ConversationLabelBadge } from './ConversationLabelBadge';
import { ConversationSearchHeader } from './ConversationSearchHeader';
import { ConversationSidebarItem } from './ConversationSidebarItem';
import { ConversationsEmptyState } from './ConversationsEmptyState';
import { CollapsibleGroupHeader } from './CollapsibleGroupHeader';
import { SectionHeader } from './SectionHeader';
import type { ContentSearchResult } from './use-conversation-search';

export interface NavChatsViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClose: () => void;
  resultCount: number;
  isLoading: boolean;
  isEmpty: boolean;
  isSearchActive: boolean;
  filteredGroups: ConversationGroup[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupKey: string) => void;
  onNewSession: () => void;
  onNavigate: (href: string) => void;
  onRename: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  navigatorRef: RefObject<HTMLDivElement | null>;
  contentSearchResults: Map<string, ContentSearchResult>;
  activeChatMatchInfo?: { sessionId: string; count: number } | null;
  multiSelectedIds: Set<string>;
  focusedConversationId: string | null;
  onConversationClick: (conversationId: string, index: number, href: string) => void;
  onConversationMouseDown: (
    event: ReactMouseEvent,
    conversationId: string,
    index: number
  ) => void;
  onConversationKeyDown: (
    event: ReactKeyboardEvent,
    conversation: Conversation,
    index: number
  ) => void;
  registerConversationElement: (conversationId: string, element: HTMLDivElement | null) => void;
  onNavigatorMouseDown: () => void;
}

function ConversationIndicators({ conversation, isProcessing }: { conversation: Conversation; isProcessing: boolean }) {
  const hasUnreadMeta = Boolean(conversation.has_unread_meta);
  const hasPlan = conversation.last_message_role === 'plan';
  const hasPendingPrompt = (conversation.pending_prompt_count ?? 0) > 0;

  return (
    <>
      <div className="flex items-center justify-center text-muted-foreground/75">
        <div className="h-3.5 w-3.5 rounded-full border border-current/70" />
      </div>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden gap-1 transition-all duration-200 ease-out',
          isProcessing || hasUnreadMeta || hasPlan || hasPendingPrompt
            ? 'opacity-100 ml-0'
            : '!w-0 opacity-0 -ml-[10px]'
        )}
      >
        {isProcessing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[10px]" /> : null}
        {hasUnreadMeta ? (
          <svg className="text-accent h-3.5 w-3.5" viewBox="0 0 25 24" fill="currentColor" aria-hidden="true">
            <g transform="translate(1.748, 0.7832)">
              <path fillRule="nonzero" d="M10.9952443,22 C8.89638276,22 7.01311428,21.5426195 5.34543882,20.6278586 C4.85718403,21.0547471 4.29283758,21.3901594 3.65239948,21.6340956 C3.01196138,21.8780319 2.3651823,22 1.71206226,22 C1.5028102,22 1.34111543,21.9466389 1.22697795,21.8399168 C1.11284047,21.7331947 1.05735697,21.6016979 1.06052745,21.4454262 C1.06369794,21.2891545 1.13820435,21.1347886 1.28404669,20.9823285 C1.5693904,20.6621622 1.77547197,20.3400901 1.9022914,20.0161123 C2.02911082,19.6921344 2.09252054,19.3090783 2.09252054,18.8669439 C2.09252054,18.4553015 2.02276985,18.0646223 1.88326848,17.6949064 C1.74376711,17.3251906 1.5693904,16.9383229 1.36013835,16.5343035 C1.15088629,16.1302841 0.941634241,15.6748094 0.732382188,15.1678794 C0.523130134,14.6609494 0.348753423,14.0682606 0.209252054,13.3898129 C0.0697506845,12.7113652 0,11.9147609 0,11 C0,9.40679141 0.271076524,7.93936244 0.813229572,6.5977131 C1.35538262,5.25606376 2.11946966,4.09164934 3.1054907,3.10446985 C4.09151175,2.11729037 5.25507998,1.35308385 6.59619542,0.811850312 C7.93731085,0.270616771 9.40366047,0 10.9952443,0 C12.5868281,0 14.0531777,0.270616771 15.3942931,0.811850312 C16.7354086,1.35308385 17.900562,2.11729037 18.8897536,3.10446985 C19.8789451,4.09164934 20.6446174,5.25606376 21.1867704,6.5977131 C21.7289235,7.93936244 22,9.40679141 22,11 C22,12.5932086 21.7289235,14.0606376 21.1867704,15.4022869 C20.6446174,16.7439362 19.8805303,17.9083507 18.8945093,18.8955301 C17.9084883,19.8827096 16.74492,20.6469161 15.4038046,21.1881497 C14.0626891,21.7293832 12.593169,22 10.9952443,22 Z" />
            </g>
          </svg>
        ) : null}
        {hasPlan ? <Triangle className="h-3.5 w-3.5 fill-current text-emerald-500" /> : null}
        {hasPendingPrompt ? <ShieldAlert className="h-3.5 w-3.5 text-sky-500" /> : null}
      </div>
    </>
  );
}

function SearchCountBadge({ count, isSelected }: { count: number; isSelected: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] px-1 py-0.5 rounded-[6px] text-[10px] font-medium tabular-nums leading-tight whitespace-nowrap shadow-tinted',
        isSelected
          ? 'bg-yellow-300/50 border border-yellow-500 text-yellow-900'
          : 'bg-yellow-300/10 border border-yellow-600/20 text-yellow-800'
      )}
      style={{
        ['--shadow-color' as string]: isSelected ? '234, 179, 8' : '133, 77, 14',
      }}
      title="Matches found"
    >
      {count}
    </span>
  );
}

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
  onNavigate,
  onRename,
  onDelete,
  navigatorRef,
  contentSearchResults,
  activeChatMatchInfo,
  multiSelectedIds,
  focusedConversationId,
  onConversationClick,
  onConversationMouseDown,
  onConversationKeyDown,
  registerConversationElement,
  onNavigatorMouseDown,
}: NavChatsViewProps): React.JSX.Element {
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
        description="Try a different title fragment. Search also digs through loaded chat history once you have at least two characters."
      />
    );
  } else {
    let flatIndex = -1;

    content = (
      <div
        ref={navigatorRef}
        className="pt-1 outline-none"
        role="listbox"
        aria-label="Sessions"
        onMouseDown={onNavigatorMouseDown}
      >
        <ul className="flex w-full min-w-0 flex-col gap-0">
          {filteredGroups.map((group) => {
            const isCollapsible = !isSearchActive && filteredGroups.length > 1;
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
                  : group.items.map((conversation, index) => {
                      flatIndex += 1;
                      const visibleIndex = flatIndex;
                      const href = `/c/${conversation.id}`;
                      const isSelected = focusedConversationId === conversation.id;
                      const searchCount =
                        activeChatMatchInfo?.sessionId === conversation.id
                          ? activeChatMatchInfo.count
                          : contentSearchResults.get(conversation.id)?.matchCount;
                      const labels = conversation.labels ?? [];
                      const isProcessing = Boolean(conversation.is_processing);

                      return (
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
                          icon={<ConversationIndicators conversation={conversation} isProcessing={isProcessing} />}
                          badges={
                            labels.length > 0 ? labels.map((label, labelIndex) => <ConversationLabelBadge key={`${conversation.id}-${labelIndex}`} label={label} />) : undefined
                          }
                          titleTrailing={
                            searchCount && searchCount > 0 ? (
                              <SearchCountBadge count={searchCount} isSelected={isSelected} />
                            ) : undefined
                          }
                          isInMultiSelect={multiSelectedIds.size > 1 && multiSelectedIds.has(conversation.id)}
                          showSeparator={index > 0}
                          onClick={() => onConversationClick(conversation.id, visibleIndex, href)}
                          onMouseDown={(event) => onConversationMouseDown(event, conversation.id, visibleIndex)}
                          buttonProps={{
                            ref: (element: HTMLDivElement | null) => registerConversationElement(conversation.id, element),
                            tabIndex: isSelected ? 0 : -1,
                            role: 'option',
                            'aria-selected': isSelected,
                            onKeyDown: (event: ReactKeyboardEvent) =>
                              onConversationKeyDown(event, conversation, visibleIndex),
                          }}
                          onNavigate={onNavigate}
                          onRename={onRename}
                          onDelete={onDelete}
                        />
                      );
                    })}
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
