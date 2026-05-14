/**
 * `DocsLayout` for the product section, scoped to the product page
 * tree. Wraps every `/docs/product/**` route.
 */

import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { productSource } from '@/lib/source';

/**
 * Renders the product chrome (sidebar, breadcrumbs) around child routes.
 *
 * @param props.children - the active product page
 * @returns the wrapped layout
 */
export default function ProductLayout({ children }: { children: ReactNode }): React.ReactElement {
	return (
		<DocsLayout tree={productSource.pageTree} {...baseOptions()}>
			{children}
		</DocsLayout>
	);
}
