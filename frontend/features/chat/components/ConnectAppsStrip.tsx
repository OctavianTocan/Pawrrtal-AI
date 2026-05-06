'use client';

import { XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

/** Settings sub-page that owns integrations management. */
const INTEGRATIONS_HREF = '/settings/integrations';

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
	const router = useRouter();

	if (isDismissed) {
		return null;
	}

	const handleDismiss = (event: React.MouseEvent<HTMLButtonElement>): void => {
		// Stop the click from bubbling into the strip's click handler so dismiss
		// doesn't also trigger an integrations route push.
		event.stopPropagation();
		setIsDismissed(true);
		onDismiss?.();
	};

	const goToIntegrations = (): void => {
		router.push(INTEGRATIONS_HREF);
	};

	return (
		// Whole strip is now a single click target that routes to the
		// integrations settings page — the brand icons + dismiss X stay as
		// nested buttons (with stopPropagation) so they keep their own
		// affordances. Using onClick on the InputGroupAddon (rendered as a
		// `div role="group"`) instead of wrapping in a `<button>` because the
		// strip already contains nested buttons and the dismiss X must remain
		// keyboard-tab-reachable as its own element.
		<InputGroupAddon
			align="block-end"
			// Tighter padding (`py-1.5`) and smaller text (`text-xs`) than the
			// previous `py-2 + text-sm` layout — the strip was reading visually
			// too tall against the composer above it. Brand glyphs sit in
			// `size-7` hit targets so they group as a tight horizontal lineup
			// rather than being spaced apart by the old `size-8` + `gap-1`.
			className={cn(
				'relative cursor-pointer justify-between gap-3 bg-foreground-10 px-3 py-1.5 pb-1.5 font-normal transition-colors hover:bg-foreground/[0.12]',
				'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/50',
				className
			)}
			onClick={goToIntegrations}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					goToIntegrations();
				}
			}}
			role="link"
			tabIndex={0}
		>
			<p className="min-w-0 truncate text-xs text-muted-foreground">
				Connect your apps to get better answers
			</p>
			<div className="flex shrink-0 items-center gap-0">
				{CONNECT_APPS.map((app) => (
					<Tooltip key={app.id}>
						<TooltipTrigger asChild>
							<button
								aria-label={`Connect ${app.label}`}
								className={cn(
									'flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.06]',
									app.colorClass ?? 'text-foreground'
								)}
								onClick={(event) => {
									event.stopPropagation();
									goToIntegrations();
								}}
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
					className="ml-0.5 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
					onClick={handleDismiss}
					type="button"
				>
					<XIcon aria-hidden="true" className="size-3.5" />
				</button>
			</div>
		</InputGroupAddon>
	);
}
