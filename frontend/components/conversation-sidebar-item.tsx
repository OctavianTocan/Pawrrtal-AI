'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { ConversationSidebarItemView } from '@/components/conversation-sidebar-item-view';

interface ConversationSidebarItemProps {
  id: string;
  title: ReactNode;
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
}: ConversationSidebarItemProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const href = `/c/${id}`;
  const isSelected = pathname === href;
  const age = formatConversationAge(updatedAt);
  const absoluteHref = useMemo(() => {
    if (typeof window === 'undefined') {
      return href;
    }

    return new URL(href, window.location.origin).toString();
  }, [href]);

  return (
    <ConversationSidebarItemView
      title={title}
      isSelected={isSelected}
      showSeparator={showSeparator}
      age={age}
      href={href}
      absoluteHref={absoluteHref}
      onClick={() => router.push(href)}
      onNavigate={(target) => router.push(target)}
    />
  );
}
