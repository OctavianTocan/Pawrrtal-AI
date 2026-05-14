/**
 * `DocsLayout` for the handbook section, scoped to the handbook page
 * tree. Wraps every `/docs/handbook/**` route.
 */

import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { handbookSource } from '@/lib/source';

/**
 * Renders the handbook chrome (sidebar, breadcrumbs) around child routes.
 *
 * @param props.children - the active handbook page
 * @returns the wrapped layout
 */
export default function HandbookLayout({ children }: { children: ReactNode }): React.ReactElement {
	return (
		<DocsLayout tree={handbookSource.pageTree} {...baseOptions()}>
			{children}
		</DocsLayout>
	);
}
