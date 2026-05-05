import { Inbox, Search } from 'lucide-react';
import type {
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	RefObject,
} from 'react';
import { Fragment } from 'react';
import { ProjectsList } from '@/features/projects/components/ProjectsList';
import type { ConversationGroup } from '@/lib/conversation-groups';
import { highlightMatch } from '@/lib/highlight-match';
import type { Conversation, ConversationStatus } from '@/lib/types';
import type { ContentSearchResult } from '../hooks/use-conversation-search';
import { CollapsibleGroupHeader } from './CollapsibleGroupHeader';
import { ConversationIndicators } from './ConversationIndicators';
import { ConversationLabelBadge } from './ConversationLabelBadge';
import { ConversationSearchHeader } from './ConversationSearchHeader';
import { ConversationSidebarItem } from './ConversationSidebarItem';
import { ConversationsEmptyState } from './ConversationsEmptyState';
import { SearchCountBadge } from './SearchCountBadge';
import { SectionHeader } from './SectionHeader';

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
	/** Navigates to a conversation and closes mobile sidebar. */
	onNavigate: (href: string) => void;
	/** Opens the rename dialog for a conversation. */
	onRename: (conversationId: string) => void;
	/** Opens the delete confirmation for a conversation. */
	onDelete: (conversationId: string) => void;
	/** Toggles archived state for a conversation. */
	onArchive: (conversationId: string) => void;
	/** Toggles flagged state for a conversation. */
	onFlag: (conversationId: string) => void;
	/** Sets the status tag on a conversation. */
	onSetStatus: (conversationId: string, status: ConversationStatus) => void;
	/** Toggles the unread indicator on a conversation. */
	onMarkUnread: (conversationId: string) => void;
	/** Triggers LLM title regeneration for a conversation. */
	onRegenerateTitle: (conversationId: string) => void;
	/** Toggles a single label ID on/off for a conversation. */
	onToggleLabel: (conversationId: string, labelId: string) => void;
	/** Triggers a Markdown download for a conversation. */
	onExportMarkdown: (conversationId: string) => void;
	/** Ref attached to the navigator (listbox) root for focus-zone registration. */
	navigatorRef: RefObject<HTMLDivElement | null>;
	/** Per-conversation search results from content matching. */
	contentSearchResults: Map<string, ContentSearchResult>;
	/** Match info for the currently open chat (searched against loaded messages). */
	activeChatMatchInfo?: { sessionId: string; count: number } | null;
	/** Set of conversation IDs in the current multi-selection. */
	multiSelectedIds: Set<string>;
	/** The conversation ID that should appear keyboard-focused. */
	focusedConversationId: string | null;
	/** Called when a conversation row is clicked (select + navigate). */
	onConversationClick: (conversationId: string, index: number, href: string) => void;
	/** Called on mouseDown for modifier-key multi-select handling. */
	onConversationMouseDown: (
		event: ReactMouseEvent,
		conversationId: string,
		index: number
	) => void;
	/** Keyboard handler for arrow navigation, range-select, and zone switching. */
	onConversationKeyDown: (
		event: ReactKeyboardEvent,
		conversation: Conversation,
		index: number
	) => void;
	/** Ref callback to register conversation row elements for programmatic focus. */
	registerConversationElement: (conversationId: string, element: HTMLDivElement | null) => void;
	/** Claims navigator focus zone on mouseDown (before click fires). */
	onNavigatorMouseDown: () => void;
}

/** Renders a single conversation row within a group, computing derived state from search results. */
function ConversationRow({
	conversation,
	index,
	visibleIndex,
	isSearchActive,
	searchQuery,
	multiSelectedIds,
	contentSearchResults,
	activeChatMatchInfo,
	onConversationClick,
	onConversationMouseDown,
	onConversationKeyDown,
	registerConversationElement,
	onNavigate,
	onRename,
	onDelete,
	onArchive,
	onFlag,
	onSetStatus,
	onMarkUnread,
	onRegenerateTitle,
	onToggleLabel,
	onExportMarkdown,
}: {
	conversation: Conversation;
	index: number;
	visibleIndex: number;
	isSearchActive: boolean;
	searchQuery: string;
	multiSelectedIds: Set<string>;
	contentSearchResults: Map<string, ContentSearchResult>;
	activeChatMatchInfo?: { sessionId: string; count: number } | null;
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
	onNavigate: (href: string) => void;
	onRename: (conversationId: string) => void;
	onDelete: (conversationId: string) => void;
	onArchive: (conversationId: string) => void;
	onFlag: (conversationId: string) => void;
	onSetStatus: (conversationId: string, status: ConversationStatus) => void;
	onMarkUnread: (conversationId: string) => void;
	onRegenerateTitle: (conversationId: string) => void;
	onToggleLabel: (conversationId: string, labelId: string) => void;
	onExportMarkdown: (conversationId: string) => void;
}): React.JSX.Element {
	const href = `/c/${conversation.id}`;
	const isSelected = multiSelectedIds.has(conversation.id);
	const searchCount =
		activeChatMatchInfo?.sessionId === conversation.id
			? activeChatMatchInfo.count
			: contentSearchResults.get(conversation.id)?.matchCount;
	const labels = conversation.labels ?? [];
	const isProcessing = Boolean(conversation.is_processing);
	// Only override the row's left icon slot when the row has live activity
	// (processing spinner, server-side unread meta, plan, queued prompts).
	// Otherwise let `ConversationSidebarItemView`'s status glyph fallback
	// render — that's what makes the colored dot reflect status changes.
	const hasLiveIndicators =
		isProcessing ||
		Boolean(conversation.has_unread_meta) ||
		conversation.last_message_role === 'plan' ||
		(conversation.pending_prompt_count ?? 0) > 0;

	return (
		<ConversationSidebarItem
			id={conversation.id}
			title={
				isSearchActive
					? highlightMatch(conversation.title, searchQuery)
					: conversation.title
			}
			updatedAt={conversation.updated_at}
			icon={
				hasLiveIndicators ? (
					<ConversationIndicators
						conversation={conversation}
						isProcessing={isProcessing}
					/>
				) : undefined
			}
			badges={
				labels.length > 0
					? labels.map((label) => {
							const labelKey =
								typeof label === 'string' ? label : (label.id ?? label.name);
							return (
								<ConversationLabelBadge
									key={`${conversation.id}-${labelKey}`}
									label={label}
								/>
							);
						})
					: undefined
			}
			titleTrailing={
				searchCount && searchCount > 0 ? (
					<SearchCountBadge count={searchCount} isSelected={isSelected} />
				) : undefined
			}
			isInMultiSelect={multiSelectedIds.size > 1 && isSelected}
			showSeparator={index > 0}
			onClick={() => onConversationClick(conversation.id, visibleIndex, href)}
			onMouseDown={(event) => onConversationMouseDown(event, conversation.id, visibleIndex)}
			buttonProps={{
				ref: (element: HTMLDivElement | null) =>
					registerConversationElement(conversation.id, element),
				// TODO(#83): tabIndex should be driven by focusedConversationId (roving tabindex)
				// so the keyboard-focused item gets 0 and all others get -1. Currently falls
				// back to isSelected until the orchestration layer wires focusedConversationId
				// through to ConversationRow.
				tabIndex: isSelected ? 0 : -1,
				role: 'option',
				'aria-selected': isSelected,
				onKeyDown: (event: ReactKeyboardEvent) =>
					onConversationKeyDown(event, conversation, visibleIndex),
			}}
			isArchived={conversation.is_archived}
			isFlagged={conversation.is_flagged}
			isUnread={conversation.is_unread}
			status={conversation.status}
			appliedLabelIds={labels.filter((label): label is string => typeof label === 'string')}
			onNavigate={onNavigate}
			onRename={onRename}
			onDelete={onDelete}
			onArchive={onArchive}
			onFlag={onFlag}
			onSetStatus={onSetStatus}
			onMarkUnread={onMarkUnread}
			onRegenerateTitle={onRegenerateTitle}
			onToggleLabel={onToggleLabel}
			onExportMarkdown={onExportMarkdown}
		/>
	);
}

/**
 * Builds the inner content of the conversation list: loading placeholder,
 * empty states, or the grouped conversation rows. Extracted from NavChatsView
 * to keep the main component under the Biome line-count threshold.
 */
function NavChatsContent({
	isLoading,
	isEmpty,
	isSearchActive,
	resultCount,
	filteredGroups,
	collapsedGroups,
	navigatorRef,
	searchQuery,
	multiSelectedIds,
	contentSearchResults,
	activeChatMatchInfo,
	onToggleGroup,
	onNewSession,
	onNavigate,
	onRename,
	onDelete,
	onArchive,
	onFlag,
	onSetStatus,
	onMarkUnread,
	onRegenerateTitle,
	onToggleLabel,
	onExportMarkdown,
	onConversationClick,
	onConversationMouseDown,
	onConversationKeyDown,
	registerConversationElement,
	onNavigatorMouseDown,
}: Pick<
	NavChatsViewProps,
	| 'isLoading'
	| 'isEmpty'
	| 'isSearchActive'
	| 'resultCount'
	| 'filteredGroups'
	| 'collapsedGroups'
	| 'navigatorRef'
	| 'searchQuery'
	| 'multiSelectedIds'
	| 'contentSearchResults'
	| 'activeChatMatchInfo'
	| 'onToggleGroup'
	| 'onNewSession'
	| 'onNavigate'
	| 'onRename'
	| 'onDelete'
	| 'onArchive'
	| 'onFlag'
	| 'onSetStatus'
	| 'onMarkUnread'
	| 'onRegenerateTitle'
	| 'onToggleLabel'
	| 'onExportMarkdown'
	| 'onConversationClick'
	| 'onConversationMouseDown'
	| 'onConversationKeyDown'
	| 'registerConversationElement'
	| 'onNavigatorMouseDown'
>): React.JSX.Element | null {
	if (isLoading) {
		return null;
	}

	if (isEmpty) {
		return (
			<ConversationsEmptyState
				icon={<Inbox className="h-4 w-4" />}
				title="No sessions yet"
				description="Sessions with your agent appear here. Start one to get going."
				buttonLabel="New Session"
				onAction={onNewSession}
			/>
		);
	}

	if (isSearchActive && resultCount === 0) {
		return (
			<ConversationsEmptyState
				icon={<Search className="h-4 w-4" />}
				title="No matching sessions"
				description="Try a different title fragment. Search also digs through loaded chat history once you have at least two characters."
			/>
		);
	}

	// Pre-compute collapsed state and flat indices outside the JSX to:
	// 1. Avoid duplicated isCollapsible/isCollapsed logic (DRY)
	// 2. Avoid mutable closures that break under React StrictMode
	const canCollapse = !isSearchActive && filteredGroups.length > 1;
	const collapsedKeys = canCollapse ? collapsedGroups : new Set<string>();
	const flatIndexMap = new Map<string, number>();
	let fi = 0;
	for (const group of filteredGroups) {
		if (!collapsedKeys.has(group.key)) {
			for (const conversation of group.items) {
				flatIndexMap.set(conversation.id, fi++);
			}
		}
	}

	return (
		<div
			ref={navigatorRef}
			className="min-h-0 flex-1 overflow-y-auto pt-1 outline-none"
			role="listbox"
			aria-label="Sessions"
			aria-multiselectable="true"
			onMouseDown={onNavigatorMouseDown}
		>
			<ul className="flex w-full min-w-0 flex-col gap-0">
				{filteredGroups.map((group) => {
					const isCollapsed = collapsedKeys.has(group.key);

					return (
						<Fragment key={group.key}>
							{canCollapse ? (
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
										<ConversationRow
											key={conversation.id}
											conversation={conversation}
											index={index}
											visibleIndex={flatIndexMap.get(conversation.id) ?? 0}
											isSearchActive={isSearchActive}
											searchQuery={searchQuery}
											multiSelectedIds={multiSelectedIds}
											contentSearchResults={contentSearchResults}
											activeChatMatchInfo={activeChatMatchInfo}
											onConversationClick={onConversationClick}
											onConversationMouseDown={onConversationMouseDown}
											onConversationKeyDown={onConversationKeyDown}
											registerConversationElement={
												registerConversationElement
											}
											onNavigate={onNavigate}
											onRename={onRename}
											onDelete={onDelete}
											onArchive={onArchive}
											onFlag={onFlag}
											onSetStatus={onSetStatus}
											onMarkUnread={onMarkUnread}
											onRegenerateTitle={onRegenerateTitle}
											onToggleLabel={onToggleLabel}
											onExportMarkdown={onExportMarkdown}
										/>
									))}
						</Fragment>
					);
				})}
			</ul>
		</div>
	);
}

/**
 * Pure presentation layer for the sidebar conversation list.
 *
 * Renders the search bar (directly under the New Session control in the
 * layout), the projects section, empty states, and grouped conversation
 * items. All data and callbacks are received via props — no hooks.
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
	onNavigate,
	onRename,
	onDelete,
	onArchive,
	onFlag,
	onSetStatus,
	onMarkUnread,
	onRegenerateTitle,
	onToggleLabel,
	onExportMarkdown,
	navigatorRef,
	contentSearchResults,
	activeChatMatchInfo,
	multiSelectedIds,
	// TODO(#83): Pass focusedConversationId down to ConversationRow for roving tabindex.
	// Currently unused — the orchestration layer (PR #83) will wire this through.
	focusedConversationId: _focusedConversationId,
	onConversationClick,
	onConversationMouseDown,
	onConversationKeyDown,
	registerConversationElement,
	onNavigatorMouseDown,
}: NavChatsViewProps): React.JSX.Element {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<ConversationSearchHeader
				searchQuery={searchQuery}
				onSearchChange={onSearchChange}
				onSearchClose={onSearchClose}
				resultCount={resultCount}
			/>
			<div className="shrink-0">
				<ProjectsList />
			</div>
			<NavChatsContent
				isLoading={isLoading}
				isEmpty={isEmpty}
				isSearchActive={isSearchActive}
				resultCount={resultCount}
				filteredGroups={filteredGroups}
				collapsedGroups={collapsedGroups}
				navigatorRef={navigatorRef}
				searchQuery={searchQuery}
				multiSelectedIds={multiSelectedIds}
				contentSearchResults={contentSearchResults}
				activeChatMatchInfo={activeChatMatchInfo}
				onToggleGroup={onToggleGroup}
				onNewSession={onNewSession}
				onNavigate={onNavigate}
				onRename={onRename}
				onDelete={onDelete}
				onArchive={onArchive}
				onFlag={onFlag}
				onSetStatus={onSetStatus}
				onMarkUnread={onMarkUnread}
				onRegenerateTitle={onRegenerateTitle}
				onToggleLabel={onToggleLabel}
				onExportMarkdown={onExportMarkdown}
				onConversationClick={onConversationClick}
				onConversationMouseDown={onConversationMouseDown}
				onConversationKeyDown={onConversationKeyDown}
				registerConversationElement={registerConversationElement}
				onNavigatorMouseDown={onNavigatorMouseDown}
			/>
		</div>
	);
}
