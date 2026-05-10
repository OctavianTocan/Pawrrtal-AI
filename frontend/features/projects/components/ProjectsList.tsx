'use client';

import { ModalDescription, ModalHeader } from '@octavian-tocan/react-overlay';
import { ChevronDown, ChevronRight, FolderPlus, Pencil } from 'lucide-react';
import type * as React from 'react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { toast } from '@/lib/toast';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
	useAssignConversationToProject,
	useCreateProject,
	useGetProjects,
	useRenameProject,
} from '../hooks/use-projects';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectRow } from './ProjectRow';

/** Props for {@link ProjectsList}. */
export interface ProjectsListProps {
	/** Project ID currently selected in the URL, or null if none. */
	activeProjectId?: string | null;
	/** Called when the user clicks a project row. Receives the project ID. */
	onProjectSelect?: (projectId: string) => void;
}

/**
 * Sidebar-mounted Projects section.
 *
 * Reads the project list via React Query, renders one collapsible row
 * per project, and exposes a "new project" button in the section header.
 * Each row is a drop target for chat rows being dragged in — drop fires
 * the conversation→project assignment mutation.
 */
export function ProjectsList({
	activeProjectId,
	onProjectSelect,
}: ProjectsListProps): React.JSX.Element {
	const { data: projects, isLoading } = useGetProjects();
	const createProject = useCreateProject();
	const renameProject = useRenameProject();
	const assignConversation = useAssignConversationToProject();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [renameTarget, setRenameTarget] = useState<Project | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const openCreateModal = (): void => {
		setIsCreateModalOpen(true);
	};

	const closeCreateModal = (): void => {
		setIsCreateModalOpen(false);
	};

	const handleCreateSubmit = (name: string): void => {
		createProject.mutate(
			{ name },
			{
				onSuccess: () => {
					closeCreateModal();
					toast.success(`Project "${name}" created`);
				},
				onError: () => toast.error('Could not create project'),
			}
		);
	};

	const handleAssign = (projectId: string, conversationId: string): void => {
		assignConversation.mutate(
			{ conversationId, projectId },
			{
				onSuccess: () => toast.success('Moved to project'),
				onError: () => toast.error('Could not move conversation'),
			}
		);
	};

	const handleRenameSubmit = (next: string): void => {
		if (!renameTarget) return;
		const trimmed = next.trim();
		if (!trimmed || trimmed === renameTarget.name) {
			setRenameTarget(null);
			return;
		}
		renameProject.mutate(
			{ projectId: renameTarget.id, name: trimmed },
			{
				onSuccess: () => setRenameTarget(null),
				onError: () => toast.error('Could not rename project'),
			}
		);
	};

	const list = projects ?? [];

	return (
		<>
			{/* Mirrors `CollapsibleGroupHeader` (the date groups in the chat
			    list): the whole row is the click/hover target via a full-width
			    button whose hover highlight is painted by an absolute pseudo-
			    element — so the user can hover anywhere across the header,
			    not just over the literal "Projects" text. The new-project
			    affordance is layered on top as an absolutely-positioned
			    button so it can stop propagation without breaking the row's
			    click target (and to dodge the invalid-HTML "button inside a
			    button" trap). Type styling matches the date-group spans:
			    `text-sm font-medium text-muted-foreground`, no more bespoke
			    `font-semibold + text-foreground` mismatch with the rest of
			    the sidebar. */}
			<header className="group/header relative mt-3">
				<button
					aria-expanded={!isCollapsed}
					aria-label={isCollapsed ? 'Expand projects' : 'Collapse projects'}
					className="relative flex w-full cursor-pointer items-center gap-1.5 px-4 py-2"
					onClick={() => setIsCollapsed((prev) => !prev)}
					type="button"
				>
					<div className="pointer-events-none absolute inset-y-0.5 left-2 right-2 rounded-[6px] transition-colors group-hover/header:bg-foreground/2" />
					{isCollapsed ? (
						<ChevronRight className="relative size-3.5 text-muted-foreground/60" />
					) : (
						<ChevronDown className="relative size-3.5 text-muted-foreground/60" />
					)}
					<span className="relative text-sm font-medium text-muted-foreground">
						Projects
					</span>
				</button>
				<button
					aria-label="Create new project"
					className={cn(
						'absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-[5px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground',
						'group-hover/header:opacity-100 focus-visible:opacity-100'
					)}
					onClick={(event) => {
						event.stopPropagation();
						openCreateModal();
					}}
					type="button"
				>
					<FolderPlus className="size-3.5" />
				</button>
			</header>

			{isCollapsed ? null : (
				<div className="flex flex-col gap-0.5 px-2 pb-1">
					{isLoading && list.length === 0 ? (
						<span className="px-2 py-1 text-sm text-muted-foreground/70">
							Loading projects…
						</span>
					) : null}
					{!isLoading && list.length === 0 ? (
						<button
							className="flex cursor-pointer items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
							onClick={openCreateModal}
							type="button"
						>
							<FolderPlus className="size-4" />
							Create your first project
						</button>
					) : null}
					{list.map((project) => (
						<ProjectRow
							id={project.id}
							isSelected={project.id === activeProjectId}
							key={project.id}
							name={project.name}
							onClick={() => onProjectSelect?.(project.id)}
							onConversationDrop={(conversationId) =>
								handleAssign(project.id, conversationId)
							}
							onRename={() => setRenameTarget(project)}
						/>
					))}
				</div>
			)}

			<CreateProjectModal
				isPending={createProject.isPending}
				onDismiss={closeCreateModal}
				onSubmit={handleCreateSubmit}
				open={isCreateModalOpen}
			/>

			<RenameProjectModal
				isPending={renameProject.isPending}
				onDismiss={() => setRenameTarget(null)}
				onSubmit={handleRenameSubmit}
				project={renameTarget}
			/>
		</>
	);
}

/**
 * Inline rename modal.
 *
 * Acts as a thin gate: when there's no `project` selected we don't render a
 * modal at all. When a project IS selected we mount {@link RenameProjectModalInner}
 * with `key={project.id}` so React fully remounts the inner form whenever
 * the user picks a different project to rename. This replaces an older
 * setState-during-render pattern that left the input fighting the user's
 * keystrokes (clearing the field auto-snapped the value back to the project
 * name) and could leave the modal in a stale-text state across opens.
 */
function RenameProjectModal({
	project,
	isPending,
	onDismiss,
	onSubmit,
}: {
	project: Project | null;
	isPending: boolean;
	onDismiss: () => void;
	onSubmit: (next: string) => void;
}): React.JSX.Element | null {
	if (!project) return null;
	return (
		<RenameProjectModalInner
			key={project.id}
			isPending={isPending}
			onDismiss={onDismiss}
			onSubmit={onSubmit}
			project={project}
		/>
	);
}

/**
 * Form body for the rename modal. Owns its own draft state, seeded from the
 * project name on mount; the `key={project.id}` on the wrapper guarantees a
 * fresh draft per project so the user can fully clear the field without it
 * snapping back.
 */
function RenameProjectModalInner({
	project,
	isPending,
	onDismiss,
	onSubmit,
}: {
	project: Project;
	isPending: boolean;
	onDismiss: () => void;
	onSubmit: (next: string) => void;
}): React.JSX.Element {
	const formId = useId();
	const [draft, setDraft] = useState(project.name);

	const header = (
		<ModalHeader
			icon={<Pencil aria-hidden className="size-4 text-white" />}
			title="Rename project"
		/>
	);

	const footer = (
		<div className="flex justify-end gap-2">
			<Button disabled={isPending} onClick={onDismiss} type="button" variant="outline">
				Cancel
			</Button>
			<Button disabled={!draft.trim() || isPending} form={formId} type="submit">
				{isPending ? 'Saving…' : 'Save'}
			</Button>
		</div>
	);

	return (
		<ResponsiveModal
			ariaLabel="Rename project"
			footer={footer}
			header={header}
			onDismiss={onDismiss}
			open
			showDismissButton
			sheetTitle="Rename project"
			size="md"
		>
			<form
				className="flex flex-col gap-4 text-foreground"
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit(draft);
				}}
			>
				<ModalDescription className="text-muted-foreground">
					Update the sidebar name for this project.
				</ModalDescription>
				<Input
					autoFocus
					maxLength={255}
					onChange={(event) => setDraft(event.target.value)}
					placeholder="Project name"
					value={draft}
				/>
			</form>
		</ResponsiveModal>
	);
}
