'use client';

/**
 * Document viewer rendered when the user opens a `.md` file from My Files.
 *
 * Two modes:
 *  - **Read mode** (default): the same prose renderer (Streamdown) the chat
 *    surface uses, with a toolbar offering "Edit", "Publish", and "Close".
 *  - **Edit mode**: a plain textarea constrained to the same max-width column
 *    as the prose view, with "Save" / "Cancel" buttons. On "Save" the
 *    component calls the `onSave` callback; if saving fails it shows an
 *    inline error banner below the toolbar.
 *
 * The component manages its own `editContent` draft state so the caller's
 * `markdown` prop stays the source-of-truth for the saved content and we
 * never mutate it directly.
 */

import {
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownPanelMenu,
} from '@octavian-tocan/react-dropdown';
import {
	ChevronDownIcon,
	CopyIcon,
	DownloadIcon,
	Loader2Icon,
	PencilIcon,
	SaveIcon,
	SendIcon,
	UserPlusIcon,
	XIcon,
} from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';
import { Streamdown } from 'streamdown';

interface DocumentViewerProps {
	/** Filename label shown at the top-left of the viewer chrome. */
	filename: string;
	/** Markdown source rendered inside the body (read-mode) or pre-filled in
	 *  the textarea (edit-mode entry). */
	markdown: string;
	/** Fired when the user clicks the close button. */
	onClose: () => void;
	/**
	 * Called when the user clicks "Save" in edit mode with the new content.
	 * The parent is responsible for the network call; while it's in-flight the
	 * Save button shows a spinner and both Save and Cancel are disabled.
	 * On error the parent should reject the promise so we can display a banner.
	 */
	onSave?: (newContent: string) => Promise<void>;
}

/**
 * Pure presentation. The container decides what Close does, and provides the
 * `onSave` handler that calls the write API.
 */
export function DocumentViewer({
	filename,
	markdown,
	onClose,
	onSave,
}: DocumentViewerProps): ReactNode {
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Seed the draft with the current markdown when the user enters edit mode.
	// Moving this into the event handler (rather than a useEffect) means the
	// captured value is always fresh and we don't need a ref to guard against
	// mid-edit overwrites.  Cross-file resets are handled by the `key` prop
	// applied to this component in KnowledgeView.
	const handleEdit = useCallback(() => {
		setEditContent(markdown);
		setSaveError(null);
		setIsEditing(true);
	}, [markdown]);

	const handleCancel = useCallback(() => {
		setIsEditing(false);
		setSaveError(null);
	}, []);

	const handleSave = useCallback(async () => {
		if (!onSave) return;
		setIsSaving(true);
		setSaveError(null);
		try {
			await onSave(editContent);
			setIsEditing(false);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : 'Save failed — please try again.');
		} finally {
			setIsSaving(false);
		}
	}, [onSave, editContent]);

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* ── Toolbar ─────────────────────────────────────────────────────── */}
			<header className="flex shrink-0 items-center gap-2 px-4 py-2">
				<span className="flex-1 truncate text-[12px] text-muted-foreground">
					{filename}
					{isEditing && (
						<span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
							editing
						</span>
					)}
				</span>

				{isEditing ? (
					/* ── Edit-mode actions ──────────────────────────────────────── */
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleCancel}
							disabled={isSaving}
							className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-foreground-5 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={isSaving || !onSave}
							className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-foreground px-2.5 text-[12px] font-medium text-background transition-colors duration-150 ease-out hover:bg-foreground/90 disabled:pointer-events-none disabled:opacity-50"
						>
							{isSaving ? (
								<Loader2Icon aria-hidden="true" className="size-3.5 animate-spin" />
							) : (
								<SaveIcon aria-hidden="true" className="size-3.5" />
							)}
							{isSaving ? 'Saving…' : 'Save'}
						</button>
					</div>
				) : (
					/* ── Read-mode actions ──────────────────────────────────────── */
					<div className="flex items-center gap-1.5">
						{onSave && (
							<button
								type="button"
								onClick={handleEdit}
								className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-foreground-5 hover:text-foreground"
							>
								<PencilIcon aria-hidden="true" className="size-3.5" />
								Edit
							</button>
						)}

						<DropdownPanelMenu
							asChild
							usePortal
							align="end"
							contentClassName="popover-styled p-1 min-w-44"
							trigger={
								<button
									type="button"
									className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-foreground-5 pr-1.5 pl-3 text-[12px] font-medium text-foreground transition-colors duration-150 ease-out hover:bg-foreground-10"
								>
									<SendIcon aria-hidden="true" className="size-3.5" />
									Publish
									<ChevronDownIcon aria-hidden="true" className="size-3.5" />
								</button>
							}
						>
							<DropdownMenuItem>
								<CopyIcon className="size-3.5" />
								Copy
							</DropdownMenuItem>
							<DropdownMenuItem>
								<DownloadIcon className="size-3.5" />
								Download
							</DropdownMenuItem>
							<DropdownMenuItem>
								<DownloadIcon className="size-3.5" />
								Download as PDF
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<SendIcon className="size-3.5" />
								Publish
							</DropdownMenuItem>
							<DropdownMenuItem>
								<UserPlusIcon className="size-3.5" />
								Invite
							</DropdownMenuItem>
						</DropdownPanelMenu>

						<button
							type="button"
							onClick={onClose}
							aria-label="Close document"
							className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground-5 hover:text-foreground"
						>
							<XIcon aria-hidden="true" className="size-4" />
						</button>
					</div>
				)}
			</header>

			{/* ── Save error banner ────────────────────────────────────────────── */}
			{saveError && (
				<div className="mx-4 mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
					<span className="mt-0.5 shrink-0">⚠</span>
					<span>{saveError}</span>
				</div>
			)}

			{/* ── Document body ────────────────────────────────────────────────── */}
			{isEditing ? (
				/*
				 * Edit mode: a monospace textarea. We deliberately use a plain
				 * <textarea> rather than a rich editor — Markdown source editing
				 * is already familiar, keeps the bundle small, and avoids the
				 * cursor-sync complexity of a preview-alongside-edit layout.
				 */
				<div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
					<div className="mx-auto max-w-[680px]">
						<textarea
							value={editContent}
							onChange={(e) => setEditContent(e.target.value)}
							disabled={isSaving}
							spellCheck={false}
							className="w-full resize-none rounded-md border border-border bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-60"
							// CSS min-height avoids recalculating rows on every keystroke.
							style={{ minHeight: '480px' }}
						/>
					</div>
				</div>
			) : (
				/*
				 * Read mode: the same prose renderer the chat surface uses.
				 * `min-h-0` lets the flex child shrink so the scroll container is
				 * the inner div, not the page.
				 */
				<div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
					<article className="prose prose-sm mx-auto max-w-[680px] text-foreground">
						<Streamdown>{markdown}</Streamdown>
					</article>
				</div>
			)}
		</div>
	);
}
