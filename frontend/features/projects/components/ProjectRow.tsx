'use client';

import { Folder, Pencil } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CONVERSATION_DRAG_MIME } from '../constants';

/** Props for {@link ProjectRow}. */
export interface ProjectRowProps {
	id: string;
	name: string;
	/** Highlight the row + suppress hover styling (selected route). */
	isSelected?: boolean;
	/** Called when the user clicks the row body. */
	onClick: () => void;
	/** Called when the user clicks the rename pencil. */
	onRename: () => void;
	/**
	 * Fires after a chat row is dropped onto this project. Receives the
	 * conversation ID extracted from the dataTransfer payload.
	 */
	onConversationDrop: (conversationId: string) => void;
}

/**
 * Single project row in the sidebar's Projects list.
 *
 * Acts as both a navigation target (click → open project filter) and a
 * drop target for chat rows being dragged in. Per DESIGN.md → Interactive
 * Affordances → Hit Targets, the **whole row** is the drop target with
 * `min-h-9` so the drop zone matches what the user perceives. While a
 * valid conversation drag hovers, the row paints `bg-foreground-10` plus
 * an accent ring and switches the cursor to `copy` so the drop affordance
 * is unambiguous.
 *
 * The rename pencil sits inside the row but stops drag/click propagation
 * so dragging onto the pencil still lands as a project assignment.
 */
export function ProjectRow({
	id,
	name,
	isSelected,
	onClick,
	onRename,
	onConversationDrop,
}: ProjectRowProps): React.JSX.Element {
	const [isDropTarget, setIsDropTarget] = useState(false);

	const acceptsConversation = (event: React.DragEvent<HTMLElement>): boolean => {
		return Array.from(event.dataTransfer.types).includes(CONVERSATION_DRAG_MIME);
	};

	const handleDragEnter = (event: React.DragEvent<HTMLElement>): void => {
		if (!acceptsConversation(event)) return;
		event.preventDefault();
		setIsDropTarget(true);
	};

	const handleDragOver = (event: React.DragEvent<HTMLElement>): void => {
		if (!acceptsConversation(event)) return;
		// Spec: must call preventDefault on every dragover to mark the
		// element as a valid drop target. Without it the drop event never
		// fires even if the dataTransfer payload matches.
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		// Re-assert during drag-over so quick re-entries (cursor briefly
		// over a child element) restore the highlight before drop.
		if (!isDropTarget) setIsDropTarget(true);
	};

	const handleDragLeave = (event: React.DragEvent<HTMLElement>): void => {
		if (!acceptsConversation(event)) return;
		// Only clear when leaving the row itself, not when crossing into
		// nested children — descendants of the row's wrapper still belong
		// to the same hit area, so a child→parent boundary crossing must
		// not reset the highlight. Compare against currentTarget to ignore
		// child-internal moves.
		const next = event.relatedTarget;
		if (
			next instanceof Node &&
			event.currentTarget instanceof Node &&
			event.currentTarget.contains(next)
		) {
			return;
		}
		setIsDropTarget(false);
	};

	const handleDrop = (event: React.DragEvent<HTMLElement>): void => {
		if (!acceptsConversation(event)) return;
		event.preventDefault();
		setIsDropTarget(false);
		const conversationId = event.dataTransfer.getData(CONVERSATION_DRAG_MIME);
		if (conversationId) {
			onConversationDrop(conversationId);
		}
	};

	return (
		// Whole row is one drop target: the outer wrapper holds the drop
		// handlers + the visual ring, the inner button is the click
		// affordance with cursor-pointer/copy. The rename pencil is
		// absolutely positioned inside, marked as transparent to drag
		// events so the row beneath still receives them.
		<div className="group/project-row relative" data-project-id={id}>
			<button
				aria-current={isSelected ? 'page' : undefined}
				className={cn(
					'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 pr-9 text-left text-sm transition-colors',
					'text-foreground/85 hover:bg-foreground/[0.05] hover:text-foreground',
					isSelected && 'bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.07]',
					isDropTarget &&
						'cursor-copy bg-foreground/[0.10] text-foreground ring-1 ring-accent ring-inset hover:bg-foreground/[0.10]'
				)}
				onClick={onClick}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				type="button"
			>
				<Folder
					aria-hidden="true"
					className="size-4 shrink-0 text-muted-foreground group-hover/project-row:text-foreground"
				/>
				<span className="min-w-0 flex-1 truncate">{name}</span>
			</button>
			<button
				aria-label={`Rename ${name}`}
				className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-[5px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground group-hover/project-row:opacity-100 focus-visible:opacity-100"
				onClick={(event) => {
					event.stopPropagation();
					onRename();
				}}
				// Pencil must not swallow drag events — pass them through to
				// the row so the user can drop a chat anywhere along the row,
				// including over the pencil icon. Calling preventDefault on
				// dragOver tells the browser the underlying row is the
				// effective drop target.
				onDragEnter={(event) => event.preventDefault()}
				onDragOver={(event) => event.preventDefault()}
				type="button"
			>
				<Pencil className="size-3.5" />
			</button>
		</div>
	);
}
