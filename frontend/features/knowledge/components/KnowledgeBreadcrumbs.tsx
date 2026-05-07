'use client';

/**
 * Pill-style breadcrumb rendered above each folder/file pane.
 *
 * Shows the path from "My Files" down to the current location. Each crumb
 * except the trailing one is a button that navigates to that ancestor; the
 * trailing crumb is plain text to indicate "you are here".
 */

import { ChevronRightIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { KnowledgeBreadcrumb } from '../path-utils';

interface KnowledgeBreadcrumbsProps {
	crumbs: readonly KnowledgeBreadcrumb[];
	onNavigate: (path: string) => void;
}

/**
 * Pure presentation. The container builds the crumb list via
 * `buildBreadcrumbs(...)` from `path-utils` and translates `onNavigate`
 * into a `router.push` with the appropriate query string.
 */
export function KnowledgeBreadcrumbs({ crumbs, onNavigate }: KnowledgeBreadcrumbsProps): ReactNode {
	return (
		<nav aria-label="Knowledge breadcrumb" className="flex flex-wrap items-center gap-1">
			{crumbs.map((crumb, index) => (
				<Fragment key={`${crumb.path}-${index.toString()}`}>
					{index > 0 ? (
						<ChevronRightIcon
							aria-hidden="true"
							className="size-3.5 text-muted-foreground"
						/>
					) : null}
					{crumb.isCurrent ? (
						<span
							className="rounded-md bg-foreground-5 px-2 py-1 text-[13px] font-medium text-foreground"
							aria-current="page"
						>
							{crumb.label}
						</span>
					) : (
						<button
							type="button"
							onClick={() => onNavigate(crumb.path)}
							className={cn(
								'cursor-pointer rounded-md px-2 py-1 text-[13px] font-medium text-muted-foreground transition-colors duration-150 ease-out',
								'hover:bg-foreground-5 hover:text-foreground'
							)}
						>
							{crumb.label}
						</button>
					)}
				</Fragment>
			))}
		</nav>
	);
}
