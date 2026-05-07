'use client';

/**
 * Inner sub-sidebar rendered to the left of the Knowledge content area.
 *
 * Distinct from the global app sidebar (which stays visible and continues to
 * host conversations). This sub-sidebar groups Knowledge sub-views under two
 * headings — "My Sauna" (personal) and "Shared" — and surfaces a prominent
 * "New +" pill at the top.
 */

import {
	BrainIcon,
	FileTextIcon,
	FolderIcon,
	PlusIcon,
	SparklesIcon,
	UsersIcon,
} from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { KNOWLEDGE_VIEWS } from '../constants';
import type { KnowledgeViewId } from '../types';

interface SubSidebarItem {
	id: KnowledgeViewId;
	label: string;
	icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface SubSidebarGroup {
	label: string;
	items: readonly SubSidebarItem[];
}

const SUB_SIDEBAR_GROUPS: readonly SubSidebarGroup[] = [
	{
		label: 'My Sauna',
		items: [
			{ id: KNOWLEDGE_VIEWS.myFiles, label: 'My Files', icon: FolderIcon },
			{ id: KNOWLEDGE_VIEWS.memory, label: 'Memory', icon: BrainIcon },
			{ id: KNOWLEDGE_VIEWS.skills, label: 'Skills', icon: SparklesIcon },
		],
	},
	{
		label: 'Shared',
		items: [
			{ id: KNOWLEDGE_VIEWS.brainAccess, label: 'Brain access', icon: UsersIcon },
			{ id: KNOWLEDGE_VIEWS.sharedWithMe, label: 'Shared with me', icon: FileTextIcon },
			{ id: KNOWLEDGE_VIEWS.sharedByMe, label: 'Shared by me', icon: FileTextIcon },
		],
	},
];

interface KnowledgeSubSidebarProps {
	activeView: KnowledgeViewId;
	onSelectView: (view: KnowledgeViewId) => void;
	onNew: () => void;
}

/**
 * Pure presentation — no hooks, no side effects.
 *
 * The container owns selection state and translates `onSelectView` into a
 * URL push. We pass `activeView` rather than reading any router context
 * so the component stays trivially testable in isolation.
 */
export function KnowledgeSubSidebar({
	activeView,
	onSelectView,
	onNew,
}: KnowledgeSubSidebarProps): ReactNode {
	return (
		<aside className="flex w-[208px] shrink-0 flex-col gap-4 border-r border-border bg-foreground-2 p-3">
			<button
				type="button"
				onClick={onNew}
				className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-foreground text-[13px] font-medium text-background transition-colors duration-150 ease-out hover:bg-foreground/90"
			>
				<PlusIcon aria-hidden="true" className="size-4" />
				New
			</button>

			{SUB_SIDEBAR_GROUPS.map((group) => (
				<div key={group.label} className="flex flex-col gap-1">
					<div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
						{group.label}
					</div>
					{group.items.map((item) => {
						const isActive = item.id === activeView;
						const Icon = item.icon;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => onSelectView(item.id)}
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors duration-150 ease-out',
									isActive
										? 'bg-foreground-5 text-foreground'
										: 'text-muted-foreground hover:bg-foreground-5 hover:text-foreground'
								)}
							>
								<Icon aria-hidden="true" className="size-4 shrink-0" />
								<span className="truncate">{item.label}</span>
							</button>
						);
					})}
				</div>
			))}
		</aside>
	);
}
