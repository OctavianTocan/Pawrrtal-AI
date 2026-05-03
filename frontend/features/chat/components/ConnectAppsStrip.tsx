'use client';

import {
	GithubIcon,
	HardDriveIcon,
	type LucideIcon,
	NotebookTextIcon,
	SlackIcon,
	SquareKanbanIcon,
	XIcon,
} from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ConnectAppEntry = {
	id: string;
	label: string;
	icon: LucideIcon;
};

const CONNECT_APPS: ReadonlyArray<ConnectAppEntry> = [
	{ id: 'notion', label: 'Notion', icon: NotebookTextIcon },
	{ id: 'slack', label: 'Slack', icon: SlackIcon },
	{ id: 'google-drive', label: 'Google Drive', icon: HardDriveIcon },
	{ id: 'github', label: 'GitHub', icon: GithubIcon },
	{ id: 'linear', label: 'Linear', icon: SquareKanbanIcon },
];

/** Props for the {@link ConnectAppsStrip} component. */
export type ConnectAppsStripProps = {
	/** Additional classes for the root strip container. */
	className?: string;
	/** Optional callback fired after the user dismisses the strip. */
	onDismiss?: () => void;
};

/**
 * Renders a compact, dismissible strip below the landing chat composer that
 * nudges the user to connect their integrations (Notion, Slack, Google Drive,
 * GitHub, Linear) for richer answers.
 *
 * Dismissal is local-only (per-mount session state); no persistence yet.
 */
export function ConnectAppsStrip({
	className,
	onDismiss,
}: ConnectAppsStripProps): React.JSX.Element | null {
	const [isDismissed, setIsDismissed] = useState(false);

	if (isDismissed) {
		return null;
	}

	const handleDismiss = (): void => {
		setIsDismissed(true);
		onDismiss?.();
	};

	return (
		<div
			className={cn(
				'mt-2 flex w-full max-w-[48.75rem] items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5',
				className
			)}
		>
			<p className="min-w-0 truncate text-[12px] text-muted-foreground">
				Connect your apps to get better answers
			</p>
			<div className="flex shrink-0 items-center gap-1">
				{CONNECT_APPS.map((app) => {
					const Icon = app.icon;
					return (
						<Tooltip key={app.id}>
							<TooltipTrigger asChild>
								<button
									aria-label={`Connect ${app.label}`}
									className="flex size-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
									type="button"
								>
									<Icon aria-hidden="true" className="size-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">{app.label}</TooltipContent>
						</Tooltip>
					);
				})}
				<button
					aria-label="Dismiss connect apps strip"
					className="ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onClick={handleDismiss}
					type="button"
				>
					<XIcon aria-hidden="true" className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
