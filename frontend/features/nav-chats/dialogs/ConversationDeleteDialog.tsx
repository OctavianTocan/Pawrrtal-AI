
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

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
 * Destructive confirmation dialog for deleting a conversation.
 *
 * Renders as a centered Modal on desktop and a draggable BottomSheet on mobile
 * via {@link ResponsiveModal}. Both actions are disabled while the delete
 * mutation is in flight so the user can't double-fire.
 *
 * @returns The delete confirmation rendered through the project overlay primitive.
 */
export function ConversationDeleteDialog({
	isOpen,
	isPending,
	onOpenChange,
	onConfirm,
}: ConversationDeleteDialogProps): React.JSX.Element {
	const headingId = useId();
	const descriptionId = useId();

	return (
		<ResponsiveModal
			open={isOpen}
			onDismiss={() => {
				if (!isPending) {
					onOpenChange(false);
				}
			}}
			closeOnOverlayClick={!isPending}
			closeOnEscape={!isPending}
			ariaLabelledBy={headingId}
			ariaDescribedBy={descriptionId}
			size="sm"
			showDismissButton={!isPending}
			testId="conversation-delete-dialog"
		>
			<div className="flex flex-col gap-4 p-6 text-foreground">
				<header className="flex flex-col gap-1.5">
					<h2 id={headingId} className="text-lg font-semibold leading-none">
						Delete Conversation?
					</h2>
					<p id={descriptionId} className="text-sm text-muted-foreground">
						This removes the conversation from your sidebar. This action cannot be
						undone.
					</p>
				</header>
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={isPending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{isPending ? 'Deleting...' : 'Delete'}
					</Button>
				</div>
			</div>
		</ResponsiveModal>
	);
}
