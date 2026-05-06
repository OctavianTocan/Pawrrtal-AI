'use client';

import { ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
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
			{/* Sidebar section header. Per DESIGN.md → Sidebar Type Baseline,
			    the floor is 14px (`text-sm`) and visual de-emphasis goes
			    through tone, not size. Section heads stand out by being
			    `text-foreground font-semibold` — that's what separates
			    "Projects" from the lighter date-group rows beneath. */}
			<header className="group/projects-header mt-3 flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-foreground">
				<button
					aria-expanded={!isCollapsed}
					aria-label={isCollapsed ? 'Expand projects' : 'Collapse projects'}
					className="flex cursor-pointer items-center gap-1.5 rounded-[4px] px-1 py-0.5 text-foreground hover:text-foreground"
					onClick={() => setIsCollapsed((prev) => !prev)}
					type="button"
				>
					{isCollapsed ? (
						<ChevronRight className="size-3.5" />
					) : (
						<ChevronDown className="size-3.5" />
					)}
					Projects
				</button>
				<button
					aria-label="Create new project"
					className={cn(
						'ml-auto cursor-pointer rounded-[5px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground',
						'group-hover/projects-header:opacity-100 focus-visible:opacity-100'
					)}
					onClick={openCreateModal}
					type="button"
				>
					{/* Smaller glyph (`size-3.5` = 14px) — matches the chevron and
					    other sidebar affordances; the `size-4` plus icon was
					    visibly oversized against 14px row text. */}
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
	const [draft, setDraft] = useState(project.name);

	return (
		<ResponsiveModal
			ariaLabel="Rename project"
			onDismiss={onDismiss}
			open
			showDismissButton
			size="md"
		>
			<form
				className="flex flex-col gap-4 p-6 text-foreground"
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit(draft);
				}}
			>
				<header className="flex flex-col gap-1.5">
					<h2 className="text-lg font-semibold leading-none">Rename project</h2>
					<p className="text-sm text-muted-foreground">
						Update the sidebar name for this project.
					</p>
				</header>
				<Input
					autoFocus
					maxLength={255}
					onChange={(event) => setDraft(event.target.value)}
					placeholder="Project name"
					value={draft}
				/>
				<div className="flex justify-end gap-2">
					<Button
						disabled={isPending}
						onClick={onDismiss}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={!draft.trim() || isPending} type="submit">
						{isPending ? 'Saving…' : 'Save'}
					</Button>
				</div>
			</form>
		</ResponsiveModal>
	);
}
