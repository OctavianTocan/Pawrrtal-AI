/**
 * Helpers for navigating the mock file tree by path string.
 *
 * The URL exposes a single `?path=` parameter (forward-slash separated, URL-
 * encoded). These helpers parse that string into segments, walk the tree, and
 * compute breadcrumb segments — keeping all path arithmetic in one place so
 * the container and view never have to speak about tree internals.
 */

import { KNOWLEDGE_FILE_EXTENSION, KNOWLEDGE_PATH_SEPARATOR } from './constants';
import type { FileTreeNode } from './types';

/**
 * Splits a `?path=` value into trimmed, non-empty segments.
 *
 * Returns an empty array when the path is `null`, empty, or contains only
 * separators — both representations of "the root folder".
 */
export function parseKnowledgePath(path: string | null | undefined): string[] {
	if (!path) return [];
	return path
		.split(KNOWLEDGE_PATH_SEPARATOR)
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);
}

/**
 * Joins segments into a normalised path string suitable for `?path=`.
 *
 * Callers should still URL-encode the output via `encodeURIComponent`
 * before writing it to the address bar.
 */
export function joinKnowledgePath(segments: readonly string[]): string {
	return segments.join(KNOWLEDGE_PATH_SEPARATOR);
}

/**
 * Walks the tree following the given segments and returns the matching node,
 * or `null` if any segment fails to match.
 *
 * The first segment matches the root's children — the root itself is implicit
 * and never appears in the URL (the user never sees `My Files/` as a prefix).
 */
export function findNodeByPath(
	root: FileTreeNode,
	segments: readonly string[]
): FileTreeNode | null {
	if (segments.length === 0) return root;
	if (root.kind !== 'folder') return null;

	const [head, ...rest] = segments;
	const next = root.children.find((child) => child.name === head);
	if (!next) return null;
	return findNodeByPath(next, rest);
}

/**
 * Returns `true` when the last segment is a markdown file. Used by the
 * container to decide whether to show the document viewer or the folder list.
 */
export function isFilePath(segments: readonly string[]): boolean {
	const last = segments[segments.length - 1];
	return typeof last === 'string' && last.endsWith(KNOWLEDGE_FILE_EXTENSION);
}

/**
 * Builds breadcrumb pills for the given path segments.
 *
 * The first crumb is always the root label (`"My Files"`); each subsequent
 * crumb carries its own cumulative path so clicking it navigates upward.
 */
export interface KnowledgeBreadcrumb {
	/** Visible label rendered in the breadcrumb pill. */
	label: string;
	/** Path string this crumb navigates to (empty string = root). */
	path: string;
	/** True for the trailing crumb — usually styled differently and not focusable. */
	isCurrent: boolean;
}

/**
 * @param rootLabel - Display name for the implicit root (e.g. `"My Files"`).
 * @param segments - Path segments from `parseKnowledgePath`.
 */
export function buildBreadcrumbs(
	rootLabel: string,
	segments: readonly string[]
): KnowledgeBreadcrumb[] {
	const crumbs: KnowledgeBreadcrumb[] = [
		{ label: rootLabel, path: '', isCurrent: segments.length === 0 },
	];

	segments.forEach((segment, index) => {
		const partial = segments.slice(0, index + 1);
		crumbs.push({
			label: segment,
			path: joinKnowledgePath(partial),
			isCurrent: index === segments.length - 1,
		});
	});

	return crumbs;
}
