
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

interface ConversationRenameDialogProps {
	/** Whether the dialog is open. */
	isOpen: boolean;
	/** Whether the rename mutation is currently pending. */
	isPending: boolean;
	/** The current draft title being edited. */
	draftTitle: string;
	/** Called when the draft title changes. */
	onDraftTitleChange: (title: string) => void;
	/** Called when the dialog open state changes. */
	onOpenChange: (open: boolean) => void;
	/** Called when the form is submitted. */
	onSubmit: () => void;
}

/**
 * Dialog for renaming a conversation.
 *
 * Renders as a centered Modal on desktop and a draggable BottomSheet on mobile
 * via {@link ResponsiveModal}. Disables the Save button while the rename
 * mutation is pending or if the title is empty.
 *
 * @returns The rename dialog rendered through the project overlay primitive.
 */
export function ConversationRenameDialog({
	isOpen,
	isPending,
	draftTitle,
	onDraftTitleChange,
	onOpenChange,
	onSubmit,
}: ConversationRenameDialogProps): React.JSX.Element {
	const titleInputId = useId();
	const headingId = useId();
	const descriptionId = useId();

	return (
		<ResponsiveModal
			open={isOpen}
			onDismiss={() => onOpenChange(false)}
			ariaLabelledBy={headingId}
			ariaDescribedBy={descriptionId}
			size="md"
			showDismissButton
			testId="conversation-rename-dialog"
		>
			<div className="flex flex-col gap-4 p-6 text-foreground">
				<header className="flex flex-col gap-1.5">
					<h2 id={headingId} className="text-lg font-semibold leading-none">
						Rename Conversation
					</h2>
					<p id={descriptionId} className="text-sm text-muted-foreground">
						Update the sidebar title for this conversation.
					</p>
				</header>
				<form
					className="grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit();
					}}
				>
					<Label htmlFor={titleInputId} className="sr-only">
						Conversation title
					</Label>
					<Input
						id={titleInputId}
						value={draftTitle}
						onChange={(event) => onDraftTitleChange(event.target.value)}
						placeholder="Conversation title"
						maxLength={255}
						autoFocus
					/>
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!draftTitle.trim() || isPending}>
							{isPending ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</form>
			</div>
		</ResponsiveModal>
	);
}
