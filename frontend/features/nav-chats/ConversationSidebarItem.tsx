'use client';

import type { MouseEvent, ReactNode } from 'react';
import { formatConversationAge } from '@/lib/format-conversation-age';
import { ConversationSidebarItemView } from './ConversationSidebarItemView';

interface ConversationSidebarItemProps {
  /** The conversation ID. */
  id: string;
  /** Whether this row is the active/focused row. */
  isSelected: boolean;
  /** The conversation title (may include Calligraph or highlight wrapping). */
  title: ReactNode;
  /** ISO 8601 timestamp of the conversation's last update. */
  updatedAt: string;
  /** Optional leading icon cluster. */
  icon?: ReactNode;
  /** Optional badge row. */
  badges?: ReactNode;
  /** Optional title trailing content override. */
  titleTrailing?: ReactNode;
  /** Whether the row is included in an active multi-selection range. */
  isInMultiSelect?: boolean;
  /** Whether to render a separator above this item. */
  showSeparator: boolean;
  /** Called when the row receives a modifier-aware mouse down. */
  onMouseDown?: (event: MouseEvent) => void;
  /** Extra props forwarded to the row's button surface. */
  buttonProps?: Record<string, unknown>;
  /** Called when the row is activated. Defaults to navigating to the conversation. */
  onClick?: () => void;
  /** Called to navigate to a conversation. */
  onNavigate: (href: string) => void;
  /** Called to open the rename dialog for this conversation. */
  onRename: (conversationId: string) => void;
  /** Called to open the delete confirmation for this conversation. */
  onDelete: (conversationId: string) => void;
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
  isSelected,
  title,
  updatedAt,
  icon,
  badges,
  titleTrailing,
  isInMultiSelect = false,
  showSeparator,
  onMouseDown,
  buttonProps,
  onClick,
  onNavigate,
  onRename,
  onDelete,
}: ConversationSidebarItemProps): React.JSX.Element {
  const href = `/c/${id}`;
  const age = formatConversationAge(updatedAt);

  // Compute absolute URL for clipboard operations. No memoization needed —
  // the computation is trivial and href is already stable (derived from id).
  const absoluteHref =
    typeof window === 'undefined' ? href : new URL(href, window.location.origin).toString();

  return (
    <ConversationSidebarItemView
      title={title}
      isSelected={isSelected}
      isInMultiSelect={isInMultiSelect}
      showSeparator={showSeparator}
      age={age}
      icon={icon}
      badges={badges}
      titleTrailing={titleTrailing}
      href={href}
      absoluteHref={absoluteHref}
      onClick={onClick ?? (() => onNavigate(href))}
      onMouseDown={onMouseDown}
      buttonProps={buttonProps}
      onNavigate={onNavigate}
      onRename={() => onRename(id)}
      onDelete={() => onDelete(id)}
    />
  );
}
