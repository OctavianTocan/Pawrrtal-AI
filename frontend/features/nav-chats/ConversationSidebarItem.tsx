'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { startTransition, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/components/ui/sidebar';
import { ConversationSidebarItemView } from './ConversationSidebarItemView';
import { useDeleteConversation, useRenameConversation } from './UseConversationMutations';

interface ConversationSidebarItemProps {
  id: string;
  titleText: string;
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
  titleText,
  title,
  updatedAt,
  showSeparator,
}: ConversationSidebarItemProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const renameConversationMutation = useRenameConversation();
  const deleteConversationMutation = useDeleteConversation();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(titleText);
  const href = `/c/${id}`;
  const isSelected = pathname === href;
  const age = formatConversationAge(updatedAt);

  useEffect(() => {
    setDraftTitle(titleText);
  }, [titleText]);

  // Compute absolute URL for clipboard operations. No memoization needed —
  // the computation is trivial and href is already stable (derived from id).
  const absoluteHref =
    typeof window === 'undefined' ? href : new URL(href, window.location.origin).toString();

  const closeMobileSidebar = (): void => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navigateTo = (target: string): void => {
    closeMobileSidebar();
    startTransition(() => {
      router.push(target);
    });
  };

  const handleRenameSubmit = async (): Promise<void> => {
    const normalizedTitle = draftTitle.trim();
    if (!normalizedTitle || normalizedTitle === titleText) {
      setIsRenameOpen(false);
      setDraftTitle(titleText);
      return;
    }

    await renameConversationMutation.mutateAsync({
      conversationId: id,
      title: normalizedTitle,
    });
    setIsRenameOpen(false);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    await deleteConversationMutation.mutateAsync({ conversationId: id });
    setIsDeleteOpen(false);

    if (isSelected) {
      navigateTo('/');
    }
  };

  return (
    <>
      <ConversationSidebarItemView
        title={title}
        isSelected={isSelected}
        showSeparator={showSeparator}
        age={age}
        href={href}
        absoluteHref={absoluteHref}
        onClick={() => navigateTo(href)}
        onNavigate={navigateTo}
        onRename={() => {
          setDraftTitle(titleText);
          setIsRenameOpen(true);
        }}
        onDelete={() => setIsDeleteOpen(true)}
      />
      <Dialog
        open={isRenameOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDraftTitle(titleText);
          }
          setIsRenameOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>Update the sidebar title for this conversation.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRenameSubmit();
            }}
          >
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Conversation title"
              maxLength={255}
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftTitle(titleText);
                  setIsRenameOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!draftTitle.trim() || renameConversationMutation.isPending}
              >
                {renameConversationMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the conversation from your sidebar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConversationMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteConversationMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {deleteConversationMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
