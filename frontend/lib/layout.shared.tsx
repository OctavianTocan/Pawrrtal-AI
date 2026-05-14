/**
 * Shared `BaseLayoutProps` for Fumadocs `DocsLayout` calls across
 * sections (handbook, product). Centralises nav title + global links
 * so the chrome stays consistent.
 */

import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Returns the shared layout options consumed by every `DocsLayout`
 * instance under `/docs/**`.
 *
 * @returns shared nav title and link config
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: 'Pawrrtal Docs',
			url: '/docs',
		},
		links: [
			{ text: 'Handbook', url: '/docs/handbook', active: 'url' },
			{ text: 'Product', url: '/docs/product', active: 'url' },
			{ text: 'App', url: '/', external: false },
		],
	};
}
