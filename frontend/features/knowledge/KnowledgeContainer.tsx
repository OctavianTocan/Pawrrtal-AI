
/**
 * Container for the Knowledge surface.
 *
 * Owns:
 *  - URL state parsing (`?view=` and `?path=`).
 *  - Live workspace data via {@link useWorkspaceTree} and
 *    {@link useWorkspaceFile} (real API, not mock).
 *  - Translation of UI events (select view, open child, close file, etc.) into
 *    `router.replace` calls so the URL stays the source of truth.
 *
 * Renders the pure {@link KnowledgeView} with everything pre-resolved.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Data flow
 * ──────────────────────────────────────────────────────────────────────────
 * 1. `useWorkspaceTree()` fetches workspace list → picks default workspace →
 *    fetches its flat file-tree → converts to recursive `FileTreeNode`.
 * 2. URL `?path=` is parsed into segments.  `findNodeByPath` walks the
 *    in-memory tree to resolve the current folder and open-file node.
 * 3. When a `.md` file is open, `useWorkspaceFile()` fetches its text content
 *    lazily (keyed by workspace + path so results are cached across navigations).
 * 4. Loading / error states are surfaced through dedicated empty-state
 *    wrappers so the rest of the view is unaffected.
 */

import { AlertCircleIcon, LoaderIcon } from 'lucide-react';
import { useRouter, useSearchParams } from '@/lib/navigation';
import { type ReactNode, useCallback, useMemo } from 'react';
import { DEFAULT_KNOWLEDGE_VIEW, KNOWLEDGE_QUERY_KEYS, KNOWLEDGE_VIEWS } from './constants';
import { useWorkspaceFile } from './hooks/use-workspace-file';
import { useWorkspaceTree } from './hooks/use-workspace-tree';
import { KnowledgeView, type KnowledgeViewProps } from './KnowledgeView';
import { KNOWLEDGE_MEMORY_CARDS } from './mock-data';
import {
	buildBreadcrumbs,
	findNodeByPath,
	isFilePath,
	joinKnowledgePath,
	parseKnowledgePath,
} from './path-utils';
import type { FileTreeNode, KnowledgeViewId } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type guard for `?view=` values. Anything unrecognised falls back to the
 * default sub-view rather than rendering an unknown surface.
 */
function isKnowledgeViewId(value: string | null): value is KnowledgeViewId {
	if (!value) return false;
	const allowed: readonly string[] = Object.values(KNOWLEDGE_VIEWS);
	return allowed.includes(value);
}

/**
 * Builds a `?view=...&path=...` query string fragment.
 *
 * `path` is omitted entirely when empty — keeps the URL tidy on the root
 * `my-files` view. The framework re-encodes the value when it's written to
 * the address bar, so we don't double-encode here.
 */
function buildQuery(view: KnowledgeViewId, path: string): string {
	const params = new URLSearchParams();
	params.set(KNOWLEDGE_QUERY_KEYS.view, view);
	if (path) params.set(KNOWLEDGE_QUERY_KEYS.path, path);
	return params.toString();
}

/**
 * Empty root used as a fallback while the real workspace tree is loading.
 * Prevents downstream components from receiving `null` while we wait.
 */
const EMPTY_FILE_TREE: FileTreeNode = {
	kind: 'folder',
	name: 'My Files',
	updatedLabel: '',
	children: [],
};

// ---------------------------------------------------------------------------
// Inline loading / error states
// ---------------------------------------------------------------------------

/** Spinner shown while the workspace tree loads. */
function TreeLoadingState(): ReactNode {
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			<LoaderIcon className="size-4 animate-spin" aria-hidden="true" />
			<span className="ml-2 text-[13px]">Loading workspace…</span>
		</div>
	);
}

/** Error banner shown when the workspace tree fetch fails. */
function TreeErrorState({ message }: { message: string }): ReactNode {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-muted-foreground">
			<AlertCircleIcon className="size-5 text-destructive" aria-hidden="true" />
			<p className="text-[13px] font-medium text-foreground">Couldn't load your workspace</p>
			<p className="max-w-[340px] text-[12px]">{message}</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

/**
 * Container component. Reads the URL, resolves it to render-ready data,
 * and forwards everything to the pure View. Always rendered as a client
 * component because it needs `useSearchParams`.
 */
export function KnowledgeContainer(): ReactNode {
	const router = useRouter();
	const searchParams = useSearchParams();

	// ── URL state ─────────────────────────────────────────────────────────────

	const rawView = searchParams.get(KNOWLEDGE_QUERY_KEYS.view);
	const activeView: KnowledgeViewId = isKnowledgeViewId(rawView)
		? rawView
		: DEFAULT_KNOWLEDGE_VIEW;

	const rawPath = searchParams.get(KNOWLEDGE_QUERY_KEYS.path);
	const segments = useMemo(() => parseKnowledgePath(rawPath), [rawPath]);

	// ── Remote data ───────────────────────────────────────────────────────────

	const {
		workspaceId,
		fileTree,
		isLoading: treeLoading,
		isError: treeError,
		error,
	} = useWorkspaceTree();

	// The resolved tree — falls back to the empty root while loading so all
	// downstream `useMemo` hooks can still run without null checks.
	const resolvedTree = fileTree ?? EMPTY_FILE_TREE;

	// When the URL points at a .md file, derive the workspace-relative path
	// we need to fetch its content (matches the backend `path` field exactly).
	const openFilePath = useMemo(
		() => (isFilePath(segments) ? joinKnowledgePath(segments) : null),
		[segments]
	);

	const { content: fileContent, isLoading: fileLoading } = useWorkspaceFile(
		workspaceId,
		openFilePath
	);

	// ── Tree navigation ───────────────────────────────────────────────────────

	const folderSegments = useMemo(
		() => (isFilePath(segments) ? segments.slice(0, -1) : segments),
		[segments]
	);

	const currentNode = useMemo(
		() => findNodeByPath(resolvedTree, folderSegments),
		[resolvedTree, folderSegments]
	);

	const openFileNode = useMemo(() => {
		if (!isFilePath(segments)) return null;
		const node = findNodeByPath(resolvedTree, segments);
		if (node && node.kind === 'file') return node;
		return null;
	}, [resolvedTree, segments]);

	const crumbs = useMemo(
		() => buildBreadcrumbs(resolvedTree.name, folderSegments),
		[resolvedTree.name, folderSegments]
	);

	// ── Navigation handlers ───────────────────────────────────────────────────

	/**
	 * Pushes a new URL preserving whichever path segment is appropriate for
	 * the destination view — `path` only makes sense inside `my-files`, so
	 * other views drop it.
	 */
	const navigate = useCallback(
		(view: KnowledgeViewId, path: string) => {
			const query = buildQuery(view, path);
			// `replace` (not `push`) keeps the user's actual back-button
			// behavior intuitive — switching tabs shouldn't grow history.
			router.replace(`/knowledge?${query}`);
		},
		[router]
	);

	const handleSelectView = useCallback<KnowledgeViewProps['onSelectView']>(
		(view) => {
			const path = view === KNOWLEDGE_VIEWS.myFiles ? joinKnowledgePath(folderSegments) : '';
			navigate(view, path);
		},
		[folderSegments, navigate]
	);

	const handleNavigateBreadcrumb = useCallback<KnowledgeViewProps['onNavigateBreadcrumb']>(
		(path) => {
			navigate(KNOWLEDGE_VIEWS.myFiles, path);
		},
		[navigate]
	);

	const handleOpenChild = useCallback<KnowledgeViewProps['onOpenChild']>(
		(childName) => {
			// Both files and folders descend into the same path scheme — a `.md`
			// suffix on the trailing segment is what flips the right pane into
			// document-viewer mode, which `path-utils.isFilePath` checks.
			const nextPath = joinKnowledgePath([...folderSegments, childName]);
			navigate(KNOWLEDGE_VIEWS.myFiles, nextPath);
		},
		[folderSegments, navigate]
	);

	const handleCloseFile = useCallback<KnowledgeViewProps['onCloseFile']>(() => {
		// Drop the trailing `.md` segment so we land back on the parent folder.
		navigate(KNOWLEDGE_VIEWS.myFiles, joinKnowledgePath(folderSegments));
	}, [folderSegments, navigate]);

	const handleNew = useCallback<KnowledgeViewProps['onNew']>(() => {
		// TODO: open a "create file/folder" modal scoped to the current folder.
		// For now navigate to the root of My Files so something visibly changes.
		navigate(KNOWLEDGE_VIEWS.myFiles, '');
	}, [navigate]);

	const handleShareFromEmptyState = useCallback<
		KnowledgeViewProps['onShareFromEmptyState']
	>(() => {
		navigate(KNOWLEDGE_VIEWS.brainAccess, '');
	}, [navigate]);

	// ── Render ────────────────────────────────────────────────────────────────

	// Surface tree loading / error inline so the sub-sidebar stays visible
	// (the user can still switch to Memory / Brain Access while files load).
	if (treeLoading && activeView === KNOWLEDGE_VIEWS.myFiles) {
		return (
			<KnowledgeView
				activeView={activeView}
				onSelectView={handleSelectView}
				currentNode={null}
				crumbs={crumbs}
				onNavigateBreadcrumb={handleNavigateBreadcrumb}
				onOpenChild={handleOpenChild}
				openFile={null}
				onCloseFile={handleCloseFile}
				memoryCards={KNOWLEDGE_MEMORY_CARDS}
				onNew={handleNew}
				onShareFromEmptyState={handleShareFromEmptyState}
				contentOverride={<TreeLoadingState />}
			/>
		);
	}

	if (treeError && activeView === KNOWLEDGE_VIEWS.myFiles) {
		return (
			<KnowledgeView
				activeView={activeView}
				onSelectView={handleSelectView}
				currentNode={null}
				crumbs={crumbs}
				onNavigateBreadcrumb={handleNavigateBreadcrumb}
				onOpenChild={handleOpenChild}
				openFile={null}
				onCloseFile={handleCloseFile}
				memoryCards={KNOWLEDGE_MEMORY_CARDS}
				onNew={handleNew}
				onShareFromEmptyState={handleShareFromEmptyState}
				contentOverride={
					<TreeErrorState
						message={error?.message ?? 'Unknown error — check the backend.'}
					/>
				}
			/>
		);
	}

	// Build the `openFile` prop. Content is fetched lazily — while it loads we
	// pass an empty string so the DocumentViewer chrome is visible immediately
	// and the body area fills in once the fetch resolves.
	const openFile =
		openFileNode !== null
			? {
					name: openFileNode.name,
					markdown: fileLoading ? '' : (fileContent ?? ''),
				}
			: null;

	return (
		<KnowledgeView
			activeView={activeView}
			onSelectView={handleSelectView}
			currentNode={currentNode}
			crumbs={crumbs}
			onNavigateBreadcrumb={handleNavigateBreadcrumb}
			onOpenChild={handleOpenChild}
			openFile={openFile}
			onCloseFile={handleCloseFile}
			memoryCards={KNOWLEDGE_MEMORY_CARDS}
			onNew={handleNew}
			onShareFromEmptyState={handleShareFromEmptyState}
		/>
	);
}
