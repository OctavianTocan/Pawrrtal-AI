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
  /** Called when the row is clicked. */
  onClick?: () => void;
  /** Called to navigate in a menu item. */
  onNavigate: (href: string) => void;
  /** Opens the rename flow for this conversation. */
  onRename: () => void;
  /** Opens the delete confirmation for this conversation. */
  onDelete: () => void;
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
  buttonProps?: Record<string, unknown>;
}

/** Placeholder status icon for a conversation row (empty circle). */
function ConversationStatusIcon(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center text-muted-foreground/75">
      <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
    </div>
  );
}

/**
 * Returns a no-op handler for unimplemented menu actions.
 *
 * These menu items are UI stubs that will be wired to real functionality
 * once the backend supports them.
 */
function stubAction(_label: string): () => void {
  return () => {};
}

/**
 * Shared menu content rendered in both the dropdown and context menu
 * for a conversation row.
 *
 * Uses `useMenuComponents` to resolve polymorphic menu primitives —
 * this is a rendering context hook (not data-fetching), so it's acceptable
 * in a View component.
 */
function ConversationMenuContent({
  href,
  absoluteHref,
  onNavigate,
  onRename,
  onDelete,
}: {
  href: string;
  absoluteHref: string;
  onNavigate: (href: string) => void;
  onRename: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const { MenuItem, MenuSeparator, MenuSub, MenuSubTrigger, MenuSubContent } = useMenuComponents();

  return (
    <>
      {/* Share */}
      <MenuItem onSelect={stubAction('Share')}>
        <CloudUpload className="h-3.5 w-3.5" />
        <span className="flex-1">Share</span>
      </MenuItem>

      <MenuSeparator />

      {/* Status submenu */}
      <MenuSub>
        <MenuSubTrigger>
          <Circle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
          <span className="flex-1">Status</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem onSelect={stubAction('Status: Todo')}>
            <Circle className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} />
            <span className="flex-1">Todo</span>
          </MenuItem>
          <MenuItem onSelect={stubAction('Status: In Progress')}>
            <Circle className="h-3.5 w-3.5 text-yellow-500" strokeWidth={2.5} />
            <span className="flex-1">In Progress</span>
          </MenuItem>
          <MenuItem onSelect={stubAction('Status: Done')}>
            <Circle className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
            <span className="flex-1">Done</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      {/* Labels submenu */}
      <MenuSub>
        <MenuSubTrigger>
          <Tag className="h-3.5 w-3.5" />
          <span className="flex-1">Labels</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem disabled onSelect={stubAction('Labels')}>
            <span className="text-muted-foreground text-xs">No labels configured</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      {/* Flag */}
      <MenuItem onSelect={stubAction('Flag')}>
        <Flag className="h-3.5 w-3.5 text-info" />
        <span className="flex-1">Flag</span>
      </MenuItem>

      {/* Archive */}
      <MenuItem onSelect={stubAction('Archive')}>
        <Archive className="h-3.5 w-3.5" />
        <span className="flex-1">Archive</span>
      </MenuItem>

      {/* Mark as Unread */}
      <MenuItem onSelect={stubAction('Mark as Unread')}>
        <MailOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Mark as Unread</span>
      </MenuItem>

      <MenuSeparator />

      {/* Rename */}
      <MenuItem onSelect={onRename}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="flex-1">Rename</span>
      </MenuItem>

      {/* Regenerate Title */}
      <MenuItem onSelect={stubAction('Regenerate Title')}>
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="flex-1">Regenerate Title</span>
      </MenuItem>

      <MenuSeparator />

      {/* Open in New Panel */}
      <MenuItem onSelect={stubAction('Open in New Panel')}>
        <Columns2 className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Panel</span>
      </MenuItem>

      {/* Open in New Window */}
      <MenuItem
        onSelect={() => {
          if (typeof window !== 'undefined') {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        <AppWindow className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Window</span>
      </MenuItem>

      {/* Open */}
      <MenuItem onSelect={() => onNavigate(href)}>
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Open</span>
      </MenuItem>

      {/* Copy Link */}
      <MenuItem
        onSelect={() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            void navigator.clipboard.writeText(absoluteHref);
          }
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        <span className="flex-1">Copy Link</span>
      </MenuItem>

      <MenuSeparator />

      {/* Delete */}
      <MenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
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
  onClick,
  onNavigate,
  onRename,
  onDelete,
  icon,
  badges,
  titleTrailing,
  isInMultiSelect,
  onMouseDown,
  onClickMenuItem,
  buttonProps,
}: ConversationSidebarItemViewProps): React.JSX.Element {
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
          <div className="flex items-center gap-1">
            {titleTrailing}
            {badges}
            {age ? (
              <span className="text-[11px] text-foreground/40 whitespace-nowrap">{age}</span>
            ) : undefined}
          </div>
        }
        menuContent={
          <ConversationMenuContent
            href={href}
            absoluteHref={absoluteHref}
            onNavigate={onClickMenuItem ?? onNavigate}
            onRename={onRename}
            onDelete={onDelete}
          />
        }
        buttonProps={buttonProps}
      />
    </SidebarMenuItem>
  );
}
