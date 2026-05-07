'use client';

/**
 * Pure presentation shell for the Knowledge surface.
 *
 * Layout shape (matches the Sauna.ai reference):
 *
 * - Top of the chat-inset slot is a full-width page header (avatar + title +
 *   status chips + Select Files). The header sits ABOVE the rounded card on
 *   the page background, so the warm sidebar surface peeks through around
 *   the card edges.
 * - Below the header is a single rounded-`surface-lg` card with a 1px
 *   border tinted slightly darker than the page background. The card hosts
 *   the entire Knowledge surface — sub-sidebar on the left, content area
 *   on the right.
 * - The content area itself can be one or two columns. A leaf folder
 *   (every child is a file) renders the file-list column plus an optional
 *   document viewer card; everything else renders a single content column.
 *
 * This component is pure — all hooks live in {@link KnowledgeContainer}.
 */

import { BookOpenIcon, FileTextIcon, SparklesIcon, UsersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrainAccessPanel } from './components/BrainAccessPanel';
import { DocumentViewer } from './components/DocumentViewer';
import { EmptyState } from './components/EmptyState';
import { KnowledgeFileListColumn } from './components/KnowledgeFileListColumn';
import { KnowledgePageHeader } from './components/KnowledgePageHeader';
import { KnowledgeSubSidebar } from './components/KnowledgeSubSidebar';
import { MemoryCardList } from './components/MemoryCardList';
import { MyFilesPanel } from './components/MyFilesPanel';
import { KNOWLEDGE_VIEWS } from './constants';
import type { KnowledgeBreadcrumb } from './path-utils';
import type { FileTreeNode, KnowledgeViewId, MemoryCardData } from './types';

export interface KnowledgeViewProps {
	/** Currently-selected sub-view; drives the sub-sidebar highlight + right pane. */
	activeView: KnowledgeViewId;
	/** Fired when a sub-sidebar row is clicked. */
	onSelectView: (view: KnowledgeViewId) => void;

	/** Currently-resolved tree node when the view is `my-files`. */
	currentNode: FileTreeNode | null;
	/** Crumbs computed by the container; trailing crumb is the current node. */
	crumbs: readonly KnowledgeBreadcrumb[];
	/** Fired when a breadcrumb pill is clicked — passes the target path. */
	onNavigateBreadcrumb: (path: string) => void;
	/** Fired when a folder/file row is activated. */
	onOpenChild: (childName: string, kind: 'file' | 'folder') => void;

	/** Set when the user is viewing an `.md` file inside `my-files`. */
	openFile: { name: string; markdown: string } | null;
	/** Closes the currently-open file (drops the trailing `.md` segment). */
	onCloseFile: () => void;

	/** Memory cards for the `memory` view. */
	memoryCards: readonly MemoryCardData[];

	/** Fired by the sub-sidebar's "New +" pill. */
	onNew: () => void;
	/** Fired by the empty-state CTA on Shared views. */
	onShareFromEmptyState: () => void;
}

/**
 * Returns `true` when every child of the folder is a file. Used to decide
 * whether to render the three-column "leaf folder" layout (file list + doc
 * viewer) or the standard folder grid.
 */
function isLeafFolder(node: FileTreeNode | null): boolean {
	if (!node || node.kind !== 'folder') return false;
	if (node.children.length === 0) return false;
	return node.children.every((child) => child.kind === 'file');
}

/**
 * Right-pane router. Switches between the file browser, file list +
 * optional document viewer, memory grid, brain access, and the "shared"
 * empty states.
 *
 * Returns either a single content column or a content column plus a
 * trailing document viewer column. The parent decides how to slot them.
 */
function KnowledgeContent(props: KnowledgeViewProps): ReactNode {
	const {
		activeView,
		currentNode,
		crumbs,
		onNavigateBreadcrumb,
		onOpenChild,
		openFile,
		onCloseFile,
		memoryCards,
		onShareFromEmptyState,
	} = props;

	if (activeView === KNOWLEDGE_VIEWS.myFiles) {
		// Leaf folder OR file open inside a leaf folder → three-column shape:
		// sub-sidebar | file-list-column | document-viewer (optional).
		const leaf = isLeafFolder(currentNode);
		if (leaf && currentNode && currentNode.kind === 'folder') {
			return (
				<div className="flex min-h-0 min-w-0 flex-1">
					<KnowledgeFileListColumn
						crumbs={crumbs}
						onNavigateBreadcrumb={onNavigateBreadcrumb}
						files={currentNode.children}
						activeFileName={openFile?.name ?? null}
						onOpenFile={(name) => onOpenChild(name, 'file')}
					/>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border/60 bg-background">
						{openFile ? (
							<DocumentViewer
								filename={openFile.name}
								markdown={openFile.markdown}
								onClose={onCloseFile}
							/>
						) : (
							<EmptyState
								icon={FileTextIcon}
								title="Pick a file to read"
								description="Select a file from the list to read it here."
							/>
						)}
					</div>
				</div>
			);
		}

		// Standard folder view — sub-folders + files mixed.
		return (
			<MyFilesPanel
				currentNode={currentNode}
				crumbs={crumbs}
				onNavigateBreadcrumb={onNavigateBreadcrumb}
				onOpenChild={onOpenChild}
			/>
		);
	}

	if (activeView === KNOWLEDGE_VIEWS.memory) {
		// Centered card column — Sauna keeps Memory cards in a narrow column
		// in the middle of the surface. Right pane stays empty until a card
		// is wired to a detail route.
		return (
			<div className="flex min-h-0 min-w-0 flex-1">
				<div className="flex min-h-0 w-[320px] shrink-0 flex-col border-r border-border/60">
					<div className="flex h-12 shrink-0 items-center px-5">
						<span className="rounded-md bg-foreground-5 px-2.5 py-1 text-[13px] font-medium text-foreground">
							Memory
						</span>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
						<MemoryCardList cards={memoryCards} />
					</div>
				</div>
				<div className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-background" />
			</div>
		);
	}

	if (activeView === KNOWLEDGE_VIEWS.skills) {
		return (
			<EmptyState
				icon={SparklesIcon}
				title="Skills coming soon"
				description="Reusable skills will live here once the Sauna skills runtime ships."
			/>
		);
	}

	if (activeView === KNOWLEDGE_VIEWS.brainAccess) {
		return <BrainAccessPanel />;
	}

	if (activeView === KNOWLEDGE_VIEWS.sharedWithMe) {
		return (
			<EmptyState
				icon={FileTextIcon}
				title="Nothing shared with you yet."
				description="When someone gives you access to their Sauna, their files will land here."
				action={{ label: 'Start sharing', onClick: onShareFromEmptyState }}
			/>
		);
	}

	if (activeView === KNOWLEDGE_VIEWS.sharedByMe) {
		return (
			<EmptyState
				icon={UsersIcon}
				title="You haven’t shared anything yet."
				description="Invite a teammate to share files, memory, and skills from your Sauna."
				action={{ label: 'Start sharing', onClick: onShareFromEmptyState }}
			/>
		);
	}

	// Defensive default — unreachable while `activeView` is correctly typed.
	return (
		<EmptyState
			icon={BookOpenIcon}
			title="Pick a section"
			description="Choose a Knowledge section from the sidebar to get started."
		/>
	);
}

/**
 * Top-level shell. Renders the page header above a single rounded card
 * containing the sub-sidebar + content area.
 *
 * The outer wrapper is `bg-transparent` because the page background
 * (`bg-sidebar` from `AppLayout`) provides the warm cream surround the
 * design relies on.
 */
export function KnowledgeView(props: KnowledgeViewProps): ReactNode {
	return (
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
			<KnowledgePageHeader />

			<div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-surface-lg border border-border bg-background-elevated shadow-minimal">
				<KnowledgeSubSidebar
					activeView={props.activeView}
					onSelectView={props.onSelectView}
					onNew={props.onNew}
				/>

				<section className="flex min-h-0 min-w-0 flex-1 flex-col">
					<KnowledgeContent {...props} />
				</section>
			</div>
		</div>
	);
}
