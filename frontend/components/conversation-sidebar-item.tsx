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
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { EntityRow } from '@/components/ui/entity-row';
import { useMenuComponents } from '@/components/ui/menu-context';
import { SidebarMenuItem } from '@/components/ui/sidebar';

interface ConversationSidebarItemProps {
  id: string;
  title: ReactNode;
  ariaLabel: string;
  updatedAt: string;
  showSeparator: boolean;
}

/**
 * Formats a conversation timestamp into a compact relative-time string.
 *
 * Returns `"3s"`, `"45m"`, `"2h"`, `"5d"`, `"3w"`, `"6mo"`, or `"1y"`
 * depending on how long ago the timestamp is. Returns `null` for
 * unparseable dates.
 */
function formatConversationAge(updatedAt: string): string | null {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo`;
  }

  return `${Math.floor(diffDays / 365)}y`;
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
 * Provides actions like Share, Status, Labels, Flag, Archive, Rename,
 * Open in New Window, Copy Link, and Delete. Most are currently stubs.
 */
function ConversationMenuContent({
  href,
  label: _label,
}: {
  href: string;
  label: string;
}): React.JSX.Element {
  const router = useRouter();
  const { MenuItem, MenuSeparator, MenuSub, MenuSubTrigger, MenuSubContent } = useMenuComponents();
  const absoluteHref = useMemo(() => {
    if (typeof window === 'undefined') {
      return href;
    }

    return new URL(href, window.location.origin).toString();
  }, [href]);

  return (
    <>
      {/* Share */}
      <MenuItem onClick={stubAction('Share')}>
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
          <MenuItem onClick={stubAction('Status: Todo')}>
            <Circle className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} />
            <span className="flex-1">Todo</span>
          </MenuItem>
          <MenuItem onClick={stubAction('Status: In Progress')}>
            <Circle className="h-3.5 w-3.5 text-yellow-500" strokeWidth={2.5} />
            <span className="flex-1">In Progress</span>
          </MenuItem>
          <MenuItem onClick={stubAction('Status: Done')}>
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
          <MenuItem disabled onClick={stubAction('Labels')}>
            <span className="text-muted-foreground text-xs">No labels configured</span>
          </MenuItem>
        </MenuSubContent>
      </MenuSub>

      {/* Flag */}
      <MenuItem onClick={stubAction('Flag')}>
        <Flag className="h-3.5 w-3.5 text-info" />
        <span className="flex-1">Flag</span>
      </MenuItem>

      {/* Archive */}
      <MenuItem onClick={stubAction('Archive')}>
        <Archive className="h-3.5 w-3.5" />
        <span className="flex-1">Archive</span>
      </MenuItem>

      {/* Mark as Unread */}
      <MenuItem onClick={stubAction('Mark as Unread')}>
        <MailOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Mark as Unread</span>
      </MenuItem>

      <MenuSeparator />

      {/* Rename */}
      <MenuItem onClick={stubAction('Rename')}>
        <Pencil className="h-3.5 w-3.5" />
        <span className="flex-1">Rename</span>
      </MenuItem>

      {/* Regenerate Title */}
      <MenuItem onClick={stubAction('Regenerate Title')}>
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="flex-1">Regenerate Title</span>
      </MenuItem>

      <MenuSeparator />

      {/* Open in New Panel */}
      <MenuItem onClick={stubAction('Open in New Panel')}>
        <Columns2 className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Panel</span>
      </MenuItem>

      {/* Open in New Window */}
      <MenuItem
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.open(href, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        <AppWindow className="h-3.5 w-3.5" />
        <span className="flex-1">Open in New Window</span>
      </MenuItem>

      {/* Open */}
      <MenuItem onClick={() => router.push(href)}>
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="flex-1">Open</span>
      </MenuItem>

      {/* Copy Link */}
      <MenuItem
        onClick={() => {
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
      <MenuItem variant="destructive" onClick={stubAction('Delete')}>
        <Trash2 className="h-3.5 w-3.5" />
        <span className="flex-1">Delete</span>
      </MenuItem>
    </>
  );
}

/**
 * A single conversation row in the sidebar navigation.
 *
 * Renders an `EntityRow` with a status icon, the conversation title,
 * a relative-time age badge, and a full context/dropdown menu.
 * The row is highlighted when its route matches the current pathname.
 */
export function ConversationSidebarItem({
  id,
  title,
  ariaLabel,
  updatedAt,
  showSeparator,
}: ConversationSidebarItemProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const href = `/c/${id}`;
  const isSelected = pathname === href;
  const age = formatConversationAge(updatedAt);

  return (
    <SidebarMenuItem>
      <EntityRow
        icon={<ConversationStatusIcon />}
        showSeparator={showSeparator}
        isSelected={isSelected}
        onClick={() => router.push(href)}
        title={title}
        titleClassName="text-[13px]"
        titleTrailing={
          age ? (
            <span className="text-[11px] text-foreground/40 whitespace-nowrap">{age}</span>
          ) : undefined
        }
        menuContent={<ConversationMenuContent href={href} label={ariaLabel} />}
      />
    </SidebarMenuItem>
  );
}
