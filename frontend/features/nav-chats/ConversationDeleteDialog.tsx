'use client';

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

interface ConversationDeleteDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean;
  /** Whether the delete mutation is currently pending. */
  isPending: boolean;
  /** Called when the dialog open state changes. */
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms deletion. */
  onConfirm: () => void;
}

/**
 * Dialog for confirming conversation deletion.
 *
 * Shows a destructive confirmation dialog with a warning that the action
 * cannot be undone. Disables buttons while the delete mutation is pending.
 */
export function ConversationDeleteDialog({
  isOpen,
  isPending,
  onOpenChange,
  onConfirm,
}: ConversationDeleteDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the conversation from your sidebar. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
