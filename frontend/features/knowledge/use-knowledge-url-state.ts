'use client';

/**
 * URL-derived state for the Knowledge surface.
 *
 * Parses `?view=` and `?path=` from the address bar, resolves them
 * against the live workspace tree (`useWorkspaceTree`), and lazily
 * fetches the open file body (`useWorkspaceFile`).  Centralising this
 * lets the container component focus on render orchestration and
 * keeps the hook surface independently testable.
 */

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { DEFAULT_KNOWLEDGE_VIEW, KNOWLEDGE_QUERY_KEYS, KNOWLEDGE_VIEWS } from './constants';
import { useWorkspaceFile } from './hooks/use-workspace-file';
import { useWorkspaceTree } from './hooks/use-workspace-tree';
import {
	buildBreadcrumbs,
	findNodeByPath,
	isFilePath,
	joinKnowledgePath,
	parseKnowledgePath,
} from './path-utils';
import type { FileTreeNode, KnowledgeViewId } from './types';

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
 * Empty root used as a fallback while the real workspace tree is loading.
 * Prevents downstream consumers from receiving `null` while we wait.
 */
const EMPTY_FILE_TREE: FileTreeNode = {
	kind: 'folder',
	name: 'My Files',
	updatedLabel: '',
	children: [],
};

export interface KnowledgeUrlState {
	activeView: KnowledgeViewId;
	segments: string[];
	folderSegments: string[];
	currentNode: FileTreeNode | null;
	openFileNode: FileTreeNode | null;
	crumbs: ReturnType<typeof buildBreadcrumbs>;
	openFile: { name: string; markdown: string } | null;
	tree: { isLoading: boolean; isError: boolean; error: Error | null };
}

/**
 * Resolve the URL + workspace data into render-ready Knowledge state.
 */
export function useKnowledgeUrlState(): KnowledgeUrlState {
	const searchParams = useSearchParams();

	const rawView = searchParams.get(KNOWLEDGE_QUERY_KEYS.view);
	const activeView: KnowledgeViewId = isKnowledgeViewId(rawView)
		? rawView
		: DEFAULT_KNOWLEDGE_VIEW;

	const rawPath = searchParams.get(KNOWLEDGE_QUERY_KEYS.path);
	const segments = useMemo(() => parseKnowledgePath(rawPath), [rawPath]);

	const {
		workspaceId,
		fileTree,
		isLoading: treeLoading,
		isError: treeError,
		error,
	} = useWorkspaceTree();

	const resolvedTree = fileTree ?? EMPTY_FILE_TREE;

	const openFilePath = useMemo(
		() => (isFilePath(segments) ? joinKnowledgePath(segments) : null),
		[segments]
	);

	const { content: fileContent, isLoading: fileLoading } = useWorkspaceFile(
		workspaceId,
		openFilePath
	);

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

	// Build the `openFile` prop. Content is fetched lazily — while it
	// loads we pass an empty string so the DocumentViewer chrome is
	// visible immediately and the body area fills in once the fetch
	// resolves.
	const openFile =
		openFileNode !== null
			? {
					name: openFileNode.name,
					markdown: fileLoading ? '' : (fileContent ?? ''),
				}
			: null;

	return {
		activeView,
		segments,
		folderSegments,
		currentNode,
		openFileNode,
		crumbs,
		openFile,
		tree: { isLoading: treeLoading, isError: treeError, error },
	};
}
