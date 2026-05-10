'use client';

import { ModalHeader } from '@octavian-tocan/react-overlay';
import { FolderPlus, Lightbulb } from 'lucide-react';
import type * as React from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveModal } from '@/components/ui/responsive-modal';

/** Props for {@link CreateProjectModal}. */
export interface CreateProjectModalProps {
	/** Whether the modal is currently visible. */
	open: boolean;
	/** True while the create mutation is in flight; disables the submit button. */
	isPending: boolean;
	/** Called when the user dismisses the modal (Cancel, ESC, backdrop). */
	onDismiss: () => void;
	/** Called with the trimmed project name when the user submits. */
	onSubmit: (name: string) => void;
}

/**
 * Project-creation modal. Mirrors the ChatGPT-style "Create project" sheet:
 * project name field with a placeholder, a one-line helper explaining what
 * projects are for, Cancel + Create project buttons.
 *
 * Uses {@link ResponsiveModal} **`header`** / **`footer`** slots so
 * {@link BottomSheet} gets sticky chrome and {@link Modal} composes like the
 * react-overlay docs (`ModalHeader` + body + actions).
 *
 * The Create button is disabled while the field is empty so the user
 * never lands a project named "" (which would render as an empty row in
 * the sidebar). Submit fires via **`form`** association from the footer.
 */
export function CreateProjectModal({
	open,
	isPending,
	onDismiss,
	onSubmit,
}: CreateProjectModalProps): React.JSX.Element | null {
	const formId = useId();
	const inputId = useId();
	const [draft, setDraft] = useState('');

	if (!open) return null;

	const trimmed = draft.trim();
	const canSubmit = trimmed.length > 0 && !isPending;

	const handleClose = (): void => {
		setDraft('');
		onDismiss();
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		if (!canSubmit) return;
		onSubmit(trimmed);
		setDraft('');
	};

	const header = (
		<ModalHeader
			icon={<FolderPlus aria-hidden className="size-4 text-white" />}
			title="Create project"
		/>
	);

	const footer = (
		<div className="flex justify-end gap-2">
			<Button
				className="cursor-pointer"
				disabled={isPending}
				onClick={handleClose}
				type="button"
				variant="outline"
			>
				Cancel
			</Button>
			<Button className="cursor-pointer" disabled={!canSubmit} form={formId} type="submit">
				{isPending ? 'Creating…' : 'Create project'}
			</Button>
		</div>
	);

	return (
		<ResponsiveModal
			ariaLabel="Create project"
			footer={footer}
			header={header}
			onDismiss={handleClose}
			open={open}
			showDismissButton
			sheetTitle="Create project"
			size="md"
		>
			<form
				className="flex flex-col gap-5 text-foreground"
				id={formId}
				onSubmit={handleSubmit}
			>
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-foreground" htmlFor={inputId}>
						Project name
					</label>
					<Input
						autoFocus
						id={inputId}
						maxLength={255}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="Copenhagen Trip"
						value={draft}
					/>
				</div>

				<aside className="flex items-start gap-3 rounded-[10px] bg-foreground/[0.05] p-3 text-sm text-muted-foreground">
					<Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
					<p className="leading-snug">
						Projects keep chats, files, and custom instructions in one place. Use them
						for ongoing work, or just to keep things tidy.
					</p>
				</aside>
			</form>
		</ResponsiveModal>
	);
}
