'use client';

/**
 * Container for the Knowledge surface.
 *
 * Owns:
 *  - URL state parsing (`?view=` and `?path=`).
 *  - Mock data lookup (file tree + memory cards).
 *  - Translation of UI events (select view, open child, close file, etc.) into
 *    `router.replace` calls so the URL stays the source of truth.
 *
 * Renders the pure {@link KnowledgeView} with everything pre-resolved.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useMemo } from 'react';
import { DEFAULT_KNOWLEDGE_VIEW, KNOWLEDGE_QUERY_KEYS, KNOWLEDGE_VIEWS } from './constants';
import { KnowledgeView, type KnowledgeViewProps } from './KnowledgeView';
import { KNOWLEDGE_FILE_TREE, KNOWLEDGE_MEMORY_CARDS } from './mock-data';
import {
	buildBreadcrumbs,
	findNodeByPath,
	isFilePath,
	joinKnowledgePath,
	parseKnowledgePath,
} from './path-utils';
import type { KnowledgeViewId } from './types';

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
 * Container component. Reads the URL, resolves it to render-ready data,
 * and forwards everything to the pure View. Always rendered as a client
 * component because it needs `useSearchParams`.
 */
export function KnowledgeContainer(): ReactNode {
	const router = useRouter();
	const searchParams = useSearchParams();

	const rawView = searchParams.get(KNOWLEDGE_QUERY_KEYS.view);
	const activeView: KnowledgeViewId = isKnowledgeViewId(rawView)
		? rawView
		: DEFAULT_KNOWLEDGE_VIEW;

	const rawPath = searchParams.get(KNOWLEDGE_QUERY_KEYS.path);
	const segments = useMemo(() => parseKnowledgePath(rawPath), [rawPath]);

	const folderSegments = useMemo(
		() => (isFilePath(segments) ? segments.slice(0, -1) : segments),
		[segments]
	);

	const currentNode = useMemo(
		() => findNodeByPath(KNOWLEDGE_FILE_TREE, folderSegments),
		[folderSegments]
	);

	const openFileNode = useMemo(() => {
		if (!isFilePath(segments)) return null;
		const node = findNodeByPath(KNOWLEDGE_FILE_TREE, segments);
		if (node && node.kind === 'file') return node;
		return null;
	}, [segments]);

	const crumbs = useMemo(
		() => buildBreadcrumbs(KNOWLEDGE_FILE_TREE.name, folderSegments),
		[folderSegments]
	);

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
		// Mock — real implementation will open a "create file/folder" modal
		// scoped to the current folder. For now we navigate to the root of My
		// Files so something visibly changes.
		navigate(KNOWLEDGE_VIEWS.myFiles, '');
	}, [navigate]);

	const handleShareFromEmptyState = useCallback<
		KnowledgeViewProps['onShareFromEmptyState']
	>(() => {
		navigate(KNOWLEDGE_VIEWS.brainAccess, '');
	}, [navigate]);

	const openFile = openFileNode
		? { name: openFileNode.name, markdown: openFileNode.markdown }
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
