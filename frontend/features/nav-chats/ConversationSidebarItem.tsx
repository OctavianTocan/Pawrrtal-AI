'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { formatConversationAge } from '@/lib/format-conversation-age';
import { ConversationSidebarItemView } from './ConversationSidebarItemView';

interface ConversationSidebarItemProps {
  /** The conversation ID. */
  id: string;
  /** The conversation title (may include Calligraph or highlight wrapping). */
  title: ReactNode;
  /** ISO 8601 timestamp of the conversation's last update. */
  updatedAt: string;
  /** Whether to render a separator above this item. */
  showSeparator: boolean;
  /** Called to navigate to a conversation. */
  onNavigate: (href: string) => void;
  /** Called to open the rename dialog for this conversation. */
  onRename: (conversationId: string) => void;
  /** Called to open the delete confirmation for this conversation. */
  onDelete: (conversationId: string) => void;
  /** Icon shown before the title (e.g. processing spinner, unread dot). */
  icon?: ReactNode;
  /** Label badges shown after the title. */
  badges?: ReactNode;
  /** Content shown after the title (e.g. search match count badge). */
  titleTrailing?: ReactNode;
  /** True when this item is part of an active multi-select. */
  isInMultiSelect?: boolean;
  /** Called when the row is clicked. */
  onClick?: () => void;
  /** Called on mouse down on the row. */
  onMouseDown?: (e: React.MouseEvent) => void;
  /** Extra button props for the row's interactive element. */
  buttonProps?: Record<string, unknown>;
}

/**
 * Container for a single conversation sidebar row.
 *
 * Resolves route-derived state (isSelected, href, absoluteHref) and
 * formats the conversation age. Delegates rendering to
 * `ConversationSidebarItemView`.
 */
export function ConversationSidebarItem({
  id,
  title,
  updatedAt,
  showSeparator,
  onNavigate,
  onRename,
  onDelete,
  icon,
  badges,
  titleTrailing,
  isInMultiSelect,
  onClick,
  onMouseDown,
  buttonProps,
}: ConversationSidebarItemProps): React.JSX.Element {
  const pathname = usePathname();
  const href = `/c/${id}`;
  const isSelected = pathname === href;
  const age = formatConversationAge(updatedAt);

  // Compute absolute URL for clipboard operations. No memoization needed —
  // the computation is trivial and href is already stable (derived from id).
  const absoluteHref =
    typeof window === 'undefined' ? href : new URL(href, window.location.origin).toString();

  return (
    <ConversationSidebarItemView
      title={title}
      isSelected={isSelected}
      showSeparator={showSeparator}
      age={age}
      href={href}
      absoluteHref={absoluteHref}
      icon={icon}
      badges={badges}
      titleTrailing={titleTrailing}
      isInMultiSelect={isInMultiSelect}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onClickMenuItem={() => onNavigate(href)}
      onNavigate={onNavigate}
      onRename={() => onRename(id)}
      onDelete={() => onDelete(id)}
      buttonProps={buttonProps}
    />
  );
}
