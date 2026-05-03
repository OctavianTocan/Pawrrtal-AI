'use client';

import {
  AppWindow,
  Archive,
  Circle,
  CloudUpload,
  Columns2,
  Copy,
  Flag,
  FolderOpen,
  MailOpen,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EntityRow } from '@/components/ui/entity-row';
import { useMenuComponents } from '@/components/ui/menu-context';
import { SidebarMenuItem } from '@/components/ui/sidebar';
import type { ConversationStatus } from '@/lib/types';

/** Props for the conversation sidebar row presentation component. */
export interface ConversationSidebarItemViewProps {
  /** The conversation title (may include Calligraph or highlight wrapping). */
  title: ReactNode;
  /** Whether this row is the active route. */
  isSelected: boolean;
  /** Whether to render a separator above this item. */
  showSeparator: boolean;
  /** Compact relative-time string (e.g. "3h"), or null. */
  age: string | null;
  /** The full URL path for this conversation. */
  href: string;
  /** Absolute URL for clipboard copy. */
  absoluteHref: string;
  /** Whether the conversation is archived. */
  isArchived: boolean;
  /** Whether the conversation is flagged. */
  isFlagged: boolean;
  /** Whether the conversation has an unread indicator. */
  isUnread: boolean;
  /** Current workflow status tag. */
  status: ConversationStatus;
  /** Called when the row is clicked. */
  onClick?: () => void;
  /** Called to navigate in a menu item. */
  onNavigate: (href: string) => void;
  /** Opens the rename flow for this conversation. */
  onRename: () => void;
  /** Opens the delete confirmation for this conversation. */
  onDelete: () => void;
  /** Toggles archived state for this conversation. */
  onArchive: () => void;
  /** Toggles flagged state for this conversation. */
  onFlag: () => void;
  /** Sets the status tag for this conversation. */
  onSetStatus: (status: ConversationStatus) => void;
  /** Toggles the unread indicator for this conversation. */
  onMarkUnread: () => void;
  /** Triggers LLM title regeneration for this conversation. */
  onRegenerateTitle: () => void;
  /** Icon shown before the title (e.g. processing spinner, unread dot). */
  icon?: ReactNode;
  /** Label badges shown after the title. */
  badges?: ReactNode;
  /** Content shown after the title (e.g. search match count badge). */
  titleTrailing?: ReactNode;
  /** True when this item is part of an active multi-select. */
  isInMultiSelect?: boolean;
  /** Called on mouse down on the row. */
  onMouseDown?: (e: React.MouseEvent) => void;
  /** Called when a menu item triggers navigation (separate from onClick). */
  onClickMenuItem?: () => void;
  /** Extra button props for the row's interactive element. */
  buttonProps?: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };
}

/** Placeholder status icon for a conversation row (empty circle). */
function ConversationStatusIcon(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center text-muted-foreground/75">
      <Circle aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
    </div>
  );
}

/** Props for shared conversation menu content. */
interface ConversationMenuContentProps {
  /** The full URL path for this conversation. */
  href: string;
  /** Absolute URL for clipboard copy. */
  absoluteHref: string;
  /** Whether the conversation is archived. */
  isArchived: boolean;
  /** Whether the conversation is flagged. */
  isFlagged: boolean;
  /** Whether the conversation has an unread indicator. */
  isUnread: boolean;
  /** Current workflow status tag. */
  status: ConversationStatus;
  /** Called to navigate to this conversation. */
  onNavigate: () => void;
  /** Opens the rename flow for this conversation. */
  onRename: () => void;
  /** Opens the delete confirmation for this conversation. */
  onDelete: () => void;
  /** Toggles archived state for this conversation. */
  onArchive: () => void;
  /** Toggles flagged state for this conversation. */
  onFlag: () => void;
  /** Sets the status tag for this conversation. */
  onSetStatus: (status: ConversationStatus) => void;
  /** Toggles the unread indicator for this conversation. */
  onMarkUnread: () => void;
  /** Triggers LLM title regeneration for this conversation. */
  onRegenerateTitle: () => void;
}

/**
 * Shared menu content rendered in both the dropdown and context menu
 * for a conversation row.
 */
function ConversationMenuContent({
  href,
  absoluteHref,
  isArchived,
  isFlagged,
  isUnread,
  status,
  onNavigate,
  onRename,
  onDelete,
  onArchive,
  onFlag,
  onSetStatus,
  onMarkUnread,
  onRegenerateTitle,
}: ConversationMenuContentProps): React.JSX.Element {
  const { MenuItem, MenuSeparator, MenuSub, MenuSubTrigger, MenuSubContent } = useMenuComponents();

  return (
    <>
      <MenuItem disabled>
        <CloudUpload aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Share</span>
      </MenuItem>

      <MenuSeparator />

      <MenuSub>
        <MenuSubTrigger>
          <Circle
            aria-hidden="true"
            className="h-3.5 w-3.5 text-muted-foreground"
            strokeWidth={2.5}
          />
          <span className="flex-1">Status</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem onSelect={() => onSetStatus('todo')}>
            <Circle
              aria-hidden="true"
              className="h-3.5 w-3.5 text-blue-500"
              fill={status === 'todo' ? 'currentColor' : 'none'}
              strokeWidth={2.5}
            />
            <span className="flex-1">Todo</span>
          </MenuItem>
          <MenuItem onSelect={() => onSetStatus('in_progress')}>
            <Circle
              aria-hidden="true"
              className="h-3.5 w-3.5 text-yellow-500"
              fill={status === 'in_progress' ? 'currentColor' : 'none'}
              strokeWidth={2.5}
            />
            <span className="flex-1">In Progress</span>
          </MenuItem>
          <MenuItem onSelect={() => onSetStatus('done')}>
            <Circle
              aria-hidden="true"
              className="h-3.5 w-3.5 text-green-500"
              fill={status === 'done' ? 'currentColor' : 'none'}
              strokeWidth={2.5}
            />
            <span className="flex-1">Done</span>
          </MenuItem>
          <MenuItem onSelect={() => onSetStatus(null)}>
            <Circle
              aria-hidden="true"
              className="h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={1.5}
            />
            <span className="flex-1">No Status</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      <MenuSub>
        <MenuSubTrigger>
          <Tag aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="flex-1">Labels</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem disabled>
            <span className="text-muted-foreground text-xs">No labels configured</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      <MenuItem onSelect={onFlag}>
        <Flag
          aria-hidden="true"
          className="h-3.5 w-3.5 text-info"
          fill={isFlagged ? 'currentColor' : 'none'}
        />
        <span className="flex-1">{isFlagged ? 'Unflag' : 'Flag'}</span>
      </MenuItem>

      <MenuItem onSelect={onArchive}>
        <Archive aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">{isArchived ? 'Unarchive' : 'Archive'}</span>
      </MenuItem>

      <MenuItem onSelect={onMarkUnread}>
        <MailOpen aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">{isUnread ? 'Mark as Read' : 'Mark as Unread'}</span>
      </MenuItem>

      <MenuSeparator />

      <MenuItem onSelect={onRename}>
        <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Rename</span>
      </MenuItem>

      <MenuItem onSelect={onRegenerateTitle}>
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Regenerate Title</span>
      </MenuItem>

      <MenuSeparator />

      <MenuItem disabled>
        <Columns2 aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Panel</span>
      </MenuItem>

      <MenuItem
        onSelect={() => {
          if (typeof window !== 'undefined') {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        <AppWindow aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Window</span>
      </MenuItem>

      <MenuItem onSelect={onNavigate}>
        <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Open</span>
      </MenuItem>

      <MenuItem
        onSelect={() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(absoluteHref);
          }
        }}
      >
        <Copy aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Copy Link</span>
      </MenuItem>

      <MenuSeparator />

      <MenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1">Delete</span>
      </MenuItem>
    </>
  );
}

/**
 * Pure presentation layer for a single conversation sidebar row.
 *
 * Renders an `EntityRow` with a status icon, the conversation title,
 * a relative-time age badge, and a full context/dropdown menu.
 * All route-derived state (isSelected, href) comes from the container.
 */
export function ConversationSidebarItemView({
  title,
  isSelected,
  showSeparator,
  age,
  href,
  absoluteHref,
  isArchived,
  isFlagged,
  isUnread,
  status,
  onClick,
  onNavigate,
  onRename,
  onDelete,
  onArchive,
  onFlag,
  onSetStatus,
  onMarkUnread,
  onRegenerateTitle,
  icon,
  badges,
  titleTrailing,
  isInMultiSelect,
  onMouseDown,
  onClickMenuItem,
  buttonProps,
}: ConversationSidebarItemViewProps): React.JSX.Element {
  const handleMenuNavigate = (): void => {
    if (onClickMenuItem) {
      onClickMenuItem();
      return;
    }
    onNavigate(href);
  };

  return (
    <SidebarMenuItem>
      <EntityRow
        icon={icon ?? <ConversationStatusIcon />}
        showSeparator={showSeparator}
        isSelected={isSelected}
        isInMultiSelect={isInMultiSelect}
        onClick={onClick}
        onMouseDown={onMouseDown}
        title={title}
        titleClassName="text-[13px]"
        titleTrailing={
          titleTrailing || badges || age ? (
            <div className="flex items-center gap-1">
              {titleTrailing}
              {badges}
              {age ? (
                <span className="text-[11px] text-foreground/40 whitespace-nowrap">{age}</span>
              ) : undefined}
            </div>
          ) : undefined
        }
        menuContent={
          <ConversationMenuContent
            href={href}
            absoluteHref={absoluteHref}
            isArchived={isArchived}
            isFlagged={isFlagged}
            isUnread={isUnread}
            status={status}
            onNavigate={handleMenuNavigate}
            onRename={onRename}
            onDelete={onDelete}
            onArchive={onArchive}
            onFlag={onFlag}
            onSetStatus={onSetStatus}
            onMarkUnread={onMarkUnread}
            onRegenerateTitle={onRegenerateTitle}
          />
        }
        buttonProps={buttonProps}
      />
    </SidebarMenuItem>
  );
}
