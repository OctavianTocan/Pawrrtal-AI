'use client';

import { XIcon } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { GitHubIcon } from '@/components/brand-icons/GitHubIcon';
import { GoogleDriveIcon } from '@/components/brand-icons/GoogleDriveIcon';
import { LinearIcon } from '@/components/brand-icons/LinearIcon';
import { NotionIcon } from '@/components/brand-icons/NotionIcon';
import { SlackIcon } from '@/components/brand-icons/SlackIcon';
import { InputGroupAddon } from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type BrandIconComponent = (props: { className?: string }) => React.JSX.Element;

type ConnectAppEntry = {
	id: string;
	label: string;
	/** Brand icon component — pulled from `components/brand-icons/`. */
	Icon: BrandIconComponent;
	/** Optional Tailwind text class to color a single-color brand glyph. */
	colorClass?: string;
};

const CONNECT_APPS: ReadonlyArray<ConnectAppEntry> = [
	{ id: 'notion', label: 'Notion', Icon: NotionIcon, colorClass: 'text-foreground' },
	{ id: 'slack', label: 'Slack', Icon: SlackIcon },
	{ id: 'google-drive', label: 'Google Drive', Icon: GoogleDriveIcon },
	{ id: 'github', label: 'GitHub', Icon: GitHubIcon, colorClass: 'text-foreground' },
	{ id: 'linear', label: 'Linear', Icon: LinearIcon, colorClass: 'text-[#5e6ad2]' },
];

/** Props for the {@link ConnectAppsStrip} component. */
export type ConnectAppsStripProps = {
	/** Additional classes for the root strip container. */
	className?: string;
	/** Optional callback fired after the user dismisses the strip. */
	onDismiss?: () => void;
};

/**
 * Renders a compact, dismissible footer band attached to the bottom of the
 * landing chat composer. Designed to be rendered as a child of `<PromptInput>`
 * so it shares the same `<InputGroup>` surface and rounded corners.
 *
 * Uses real brand-color icons (per AGENTS.md icon rule, each lives in its
 * own file under `components/brand-icons/`) so the strip reads as a
 * recognisable lineup of integrations rather than abstract Lucide glyphs.
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
		<InputGroupAddon
			align="block-end"
			className={cn(
				'relative cursor-default justify-between gap-3 bg-foreground-10 px-3 py-2 font-normal',
				'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/50',
				className
			)}
		>
			<p className="min-w-0 truncate text-[12px] text-muted-foreground">
				Connect your apps to get better answers
			</p>
			<div className="flex shrink-0 items-center gap-1">
				{CONNECT_APPS.map((app) => (
					<Tooltip key={app.id}>
						<TooltipTrigger asChild>
							<button
								aria-label={`Connect ${app.label}`}
								className={cn(
									'flex size-6 items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.06]',
									app.colorClass ?? 'text-foreground'
								)}
								type="button"
							>
								<app.Icon className="size-3.5" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="top">{app.label}</TooltipContent>
					</Tooltip>
				))}
				<button
					aria-label="Dismiss connect apps strip"
					className="ml-1 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
					onClick={handleDismiss}
					type="button"
				>
					<XIcon aria-hidden="true" className="size-3.5" />
				</button>
			</div>
		</InputGroupAddon>
	);
}
