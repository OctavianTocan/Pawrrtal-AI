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
 * drop target for chat rows being dragged in. Highlights with an accent
 * outline + tinted background while a chat is hovering over it so the
 * user sees the drop will land here.
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

	const acceptsConversation = (event: React.DragEvent<HTMLDivElement>): boolean => {
		return Array.from(event.dataTransfer.types).includes(CONVERSATION_DRAG_MIME);
	};

	const handleDragEnter = (event: React.DragEvent<HTMLDivElement>): void => {
		if (!acceptsConversation(event)) return;
		event.preventDefault();
		setIsDropTarget(true);
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
		if (!acceptsConversation(event)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
		if (!acceptsConversation(event)) return;
		setIsDropTarget(false);
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
		if (!acceptsConversation(event)) return;
		event.preventDefault();
		setIsDropTarget(false);
		const conversationId = event.dataTransfer.getData(CONVERSATION_DRAG_MIME);
		if (conversationId) {
			onConversationDrop(conversationId);
		}
	};

	return (
		<div
			className={cn(
				'group/project-row relative flex w-full items-center rounded-[8px] transition-colors',
				isSelected && 'bg-foreground/[0.07]',
				isDropTarget && 'bg-accent/15 ring-1 ring-accent ring-inset'
			)}
			data-project-id={id}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<button
				aria-current={isSelected ? 'page' : undefined}
				className={cn(
					'flex min-w-0 flex-1 items-center gap-2 rounded-[8px] px-2 py-1 text-left text-[13px]',
					'cursor-pointer text-foreground/85 hover:bg-foreground/[0.05] hover:text-foreground',
					isSelected && 'text-foreground hover:bg-transparent'
				)}
				onClick={onClick}
				type="button"
			>
				<Folder
					aria-hidden="true"
					className="size-3.5 shrink-0 text-muted-foreground group-hover/project-row:text-foreground"
				/>
				<span className="min-w-0 flex-1 truncate">{name}</span>
			</button>
			<button
				aria-label={`Rename ${name}`}
				className="absolute right-1 rounded-[5px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground group-hover/project-row:opacity-100 focus-visible:opacity-100"
				onClick={(event) => {
					event.stopPropagation();
					onRename();
				}}
				type="button"
			>
				<Pencil className="size-3" />
			</button>
		</div>
	);
}
