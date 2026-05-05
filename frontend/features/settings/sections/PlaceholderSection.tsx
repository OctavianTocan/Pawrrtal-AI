'use client';

import { Construction } from 'lucide-react';
import type * as React from 'react';

/**
 * Placeholder body rendered for settings sections that aren't yet built
 * (Configuration, MCP servers, Git, Environments, Worktrees, Browser use,
 * Archived chats, Usage). Keeps the nav rail interactive without
 * promising features that don't exist.
 */
export function PlaceholderSection({ title }: { title: string }): React.JSX.Element {
	return (
		<div className="flex flex-col gap-3">
			<header>
				<h2 className="text-lg font-semibold text-foreground">{title}</h2>
			</header>
			<div className="flex items-center gap-3 rounded-[10px] border border-dashed border-foreground/15 bg-foreground/[0.02] px-5 py-8 text-sm text-muted-foreground">
				<Construction aria-hidden="true" className="size-4" />
				<span>This section is coming soon.</span>
			</div>
		</div>
	);
}
