'use client';

/**
 * Document viewer rendered when the user opens a `.md` file from My Files.
 *
 * Replaces the folder list with a header (filename + actions + close) and a
 * scrollable body that renders the file's markdown source through
 * `Streamdown` — the same renderer the chat surface uses, so prose styling
 * stays consistent across the app.
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
	FileTextIcon,
	SendIcon,
	UserPlusIcon,
	XIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Streamdown } from 'streamdown';

interface DocumentViewerProps {
	filename: string;
	markdown: string;
	onClose: () => void;
}

/**
 * Pure presentation. The container decides what the close button does
 * (typically: drop the trailing `.md` segment from the URL path).
 */
export function DocumentViewer({ filename, markdown, onClose }: DocumentViewerProps): ReactNode {
	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
				<FileTextIcon
					aria-hidden="true"
					className="size-4 shrink-0 text-muted-foreground"
				/>
				<h2 className="flex-1 truncate text-[13px] font-medium text-foreground">
					{filename}
				</h2>

				<button
					type="button"
					className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-foreground-5 px-2.5 text-[12px] font-medium text-foreground transition-colors duration-150 ease-out hover:bg-foreground-10"
				>
					<SendIcon aria-hidden="true" className="size-3.5" />
					Publish
				</button>

				<DropdownPanelMenu
					asChild
					usePortal
					align="end"
					contentClassName="popover-styled p-1 min-w-44"
					trigger={
						<button
							type="button"
							aria-label="Document actions"
							className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground-5 hover:text-foreground"
						>
							<ChevronDownIcon aria-hidden="true" className="size-4" />
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
			</header>

			{/*
			 * Document body uses the project's prose plugin (configured globally
			 * in tailwind.config). `min-h-0` lets the flex child shrink so the
			 * scroll container is the inner div, not the page.
			 */}
			<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
				<article className="prose prose-sm max-w-[680px] mx-auto text-foreground">
					<Streamdown>{markdown}</Streamdown>
				</article>
			</div>
		</div>
	);
}
