'use client';

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

interface ConversationRenameDialogProps {
  isOpen: boolean;
  isPending: boolean;
  draftTitle: string;
  onDraftTitleChange: (title: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

/**
 * Dialog for renaming a conversation.
 *
 * Shows a text input for editing the conversation title. Disables the
 * Save button while the rename mutation is pending or if the title is empty.
 */
export function ConversationRenameDialog({
  isOpen,
  isPending,
  draftTitle,
  onDraftTitleChange,
  onOpenChange,
  onSubmit,
}: ConversationRenameDialogProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Conversation</DialogTitle>
          <DialogDescription>Update the sidebar title for this conversation.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Input
            value={draftTitle}
            onChange={(event) => onDraftTitleChange(event.target.value)}
            placeholder="Conversation title"
            maxLength={255}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!draftTitle.trim() || isPending}>
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
