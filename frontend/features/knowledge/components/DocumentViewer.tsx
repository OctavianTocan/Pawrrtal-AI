/**
 * Document viewer rendered when the user opens a `.md` file from My Files.
 *
 * Self-contained card chrome: small filename label on the top-left, a
 * "Publish" pill chip with a chevron (single grouped affordance) plus a
 * close button on the top-right. The document body is the same prose
 * renderer the chat surface uses, centered in a comfortable column.
 *
 * The chrome here intentionally avoids a horizontal divider line — the
 * design reference (image 33, image 35) draws the boundary with whitespace
 * + the column's left border. Adding a hard rule made the panel feel
 * busier than the reference.
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
	SendIcon,
	UserPlusIcon,
	XIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Streamdown } from 'streamdown';

interface DocumentViewerProps {
	/** Filename label shown at the top-left of the viewer chrome. */
	filename: string;
	/** Markdown source rendered inside the body. */
	markdown: string;
	/** Fired when the user clicks the close button. */
	onClose: () => void;
}

/**
 * Pure presentation. The container decides what the close button does —
 * typically: drop the trailing `.md` segment from the URL path so the
 * file list column survives the close.
 */
export function DocumentViewer({ filename, markdown, onClose }: DocumentViewerProps): ReactNode {
	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 items-center gap-2 px-4 py-2">
				<span className="flex-1 truncate text-[12px] text-muted-foreground">
					{filename}
				</span>

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
			</header>

			{/*
			 * Document body uses the project's prose plugin (configured globally
			 * in tailwind.config). `min-h-0` lets the flex child shrink so the
			 * scroll container is the inner div, not the page.
			 */}
			<div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
				<article className="prose prose-sm mx-auto max-w-[680px] text-foreground">
					<Streamdown>{markdown}</Streamdown>
				</article>
			</div>
		</div>
	);
}
