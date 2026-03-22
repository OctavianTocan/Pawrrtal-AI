/**
 * MainContentPanel - Right panel for displaying page content
 *
 * Simplified from Craft's MainContentPanel. In our app, it simply
 * wraps children in a Panel. The full Craft version routes between
 * ChatPage, SourceInfoPage, Settings, etc. based on NavigationState.
 * We'll add that routing in later chunks.
 */

"use client";

import { Panel } from "./Panel";

export interface MainContentPanelProps {
	/** Optional className for the container */
	className?: string;
	/** Page content */
	children?: React.ReactNode;
}

export function MainContentPanel({
	className,
	children,
}: MainContentPanelProps) {
	return (
		<Panel variant="grow" className={className}>
			{children || (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					<p className="text-sm">Select a conversation to get started</p>
				</div>
			)}
		</Panel>
	);
}
