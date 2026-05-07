/**
 * Type definitions for the Knowledge feature.
 *
 * The Knowledge surface is a multi-view file/folder browser inspired by
 * Sauna's Knowledge panel. All shapes here describe in-memory mock data —
 * there is no backend integration yet. Once a real source materialises,
 * these types stay as-is and only the data fetcher swaps.
 */

import type { KNOWLEDGE_VIEWS } from './constants';

/**
 * The active sub-view inside the Knowledge surface.
 *
 * Drives the content of both the inner sub-sidebar (which row is highlighted)
 * and the right-hand pane (which surface renders). Mirrored to the URL via
 * `?view=...` so reloading or sharing a URL restores the same view.
 */
export type KnowledgeViewId = (typeof KNOWLEDGE_VIEWS)[keyof typeof KNOWLEDGE_VIEWS];

/**
 * One node in the mock file tree.
 *
 * `kind: 'folder'` carries `children` so the tree is recursive without a
 * parallel index. `kind: 'file'` carries `markdown` for the document viewer.
 * `name` is the display label and the URL path segment.
 */
export type FileTreeNode =
	| {
			kind: 'folder';
			name: string;
			updatedLabel: string;
			children: FileTreeNode[];
	  }
	| {
			kind: 'file';
			name: string;
			updatedLabel: string;
			/** Raw markdown source rendered in the document viewer. */
			markdown: string;
	  };

/**
 * Tinted background variant for memory cards. Mirrors the limited tint
 * vocabulary in `DESIGN.md` — we deliberately reuse `info`/`success`/`accent`
 * tokens with low alpha rather than introducing literal colors.
 */
export type MemoryCardTone = 'info' | 'success' | 'accent' | 'destructive' | 'foreground';

/**
 * One card on the Memory sub-view.
 *
 * Each card represents a memory category (preferences, rules, profile, etc.).
 * Real implementations will swap `count` for a live observation count and
 * route the click to a dedicated detail page.
 */
export interface MemoryCardData {
	/** Stable identifier — used as the React key and any future routing slug. */
	id: string;
	/** Card title rendered in the heading row. */
	title: string;
	/** One-line description rendered under the title. */
	description: string;
	/** Tint mapping for the icon chip background. */
	tone: MemoryCardTone;
	/** Human-readable tally label, e.g. `"24 entries"`. Mock for now. */
	count: string;
}
