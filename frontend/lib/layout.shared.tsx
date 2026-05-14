/**
 * Shared `BaseLayoutProps` for Fumadocs `DocsLayout` calls across
 * sections (handbook, product). Centralises nav title, GitHub link,
 * and global "App" link so the chrome stays consistent.
 *
 * Handbook ↔ Product navigation is surfaced via the sidebar `tabs`
 * configuration on each per-section layout, not via top-right links —
 * tabs read better when you're deep in a subtree and prevent the
 * "wait, which section am I in" feel.
 */

import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

const GITHUB_URL = 'https://github.com/OctavianTocan/pawrrtal';

/**
 * Returns the shared layout options consumed by every `DocsLayout`
 * instance under `/docs/**`.
 *
 * @returns shared nav title, GitHub URL, and the one app-link entry
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: 'Pawrrtal Docs',
			url: '/docs',
		},
		githubUrl: GITHUB_URL,
		links: [{ text: 'App', url: '/', external: false }],
	};
}
