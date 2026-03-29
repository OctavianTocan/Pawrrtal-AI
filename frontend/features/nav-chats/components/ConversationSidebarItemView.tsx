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
  buttonProps?: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };
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
