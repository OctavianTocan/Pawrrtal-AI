'use client';

/**
 * Pure presentation shell for the Knowledge surface.
 *
 * Receives the current view, the resolved file/folder node, the breadcrumb
 * list, and a small set of callbacks. Owns no hooks, no router calls, no
 * data lookup — everything routes back to {@link KnowledgeContainer}.
 *
 * The outer wrapper is a single elevated panel (the "Knowledge surface")
 * that covers the chat-inset slot inside the global app layout.
 */

import { BookOpenIcon, FileTextIcon, SparklesIcon, UsersIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrainAccessPanel } from './components/BrainAccessPanel';
import { DocumentViewer } from './components/DocumentViewer';
import { EmptyState } from './components/EmptyState';
import { KnowledgeHeader } from './components/KnowledgeHeader';
import { KnowledgeSubSidebar } from './components/KnowledgeSubSidebar';
import { MemoryCardList } from './components/MemoryCardList';
import { MyFilesPanel } from './components/MyFilesPanel';
import { KNOWLEDGE_VIEWS } from './constants';
import type { KnowledgeBreadcrumb } from './path-utils';
import type { FileTreeNode, KnowledgeViewId, MemoryCardData } from './types';

export interface KnowledgeViewProps {
	activeView: KnowledgeViewId;
	onSelectView: (view: KnowledgeViewId) => void;

	/** Currently-resolved tree node when the view is `my-files`. */
	currentNode: FileTreeNode | null;
	/** Crumbs computed by the container; trailing crumb is the current node. */
	crumbs: readonly KnowledgeBreadcrumb[];
	onNavigateBreadcrumb: (path: string) => void;
	onOpenChild: (childName: string, kind: 'file' | 'folder') => void;

	/** Set when the user is viewing an `.md` file inside `my-files`. */
	openFile: { name: string; markdown: string } | null;
	onCloseFile: () => void;

	/** Memory cards for the `memory` view. */
	memoryCards: readonly MemoryCardData[];

	onNew: () => void;
	onShareFromEmptyState: () => void;
}

/**
 * Right-pane router. Switches between the file browser (with optional
 * document overlay), memory grid, brain access invite card, and the
 * three "shared" empty states.
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
		if (openFile) {
			return (
				<DocumentViewer
					filename={openFile.name}
					markdown={openFile.markdown}
					onClose={onCloseFile}
				/>
			);
		}
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
		return (
			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				<MemoryCardList cards={memoryCards} />
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
 * Pure presentation entry point. The outer wrapper is the elevated panel
 * (rounded-[14px], shadow-minimal) that sits inside the chat-inset slot
 * provided by `AppLayout`.
 */
export function KnowledgeView(props: KnowledgeViewProps): ReactNode {
	return (
		<div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[14px] border border-border bg-background shadow-minimal">
			<KnowledgeSubSidebar
				activeView={props.activeView}
				onSelectView={props.onSelectView}
				onNew={props.onNew}
			/>

			<section className="flex min-h-0 min-w-0 flex-1 flex-col">
				<KnowledgeHeader />
				<div className="flex min-h-0 flex-1 flex-col">
					<KnowledgeContent {...props} />
				</div>
			</section>
		</div>
	);
}
