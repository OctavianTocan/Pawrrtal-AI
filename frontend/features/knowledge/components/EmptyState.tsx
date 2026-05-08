/**
 * Centered empty-state card.
 *
 * Reused across the Skills / Shared with me / Shared by me sub-views and
 * inside the Brain access tabs. Rendered as a single `popover-styled` card
 * with a soft icon, title, body, and optional CTA button.
 */

import type { ComponentType, ReactNode, SVGProps } from 'react';

interface EmptyStateProps {
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

/**
 * Pure presentation. The container chooses copy and the optional CTA;
 * this component never reads any state of its own.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps): ReactNode {
	return (
		<div className="flex h-full w-full items-center justify-center p-6">
			<div className="flex max-w-[360px] flex-col items-center gap-3 rounded-[14px] border border-border bg-background-elevated p-8 text-center shadow-minimal">
				<span className="flex size-10 items-center justify-center rounded-full bg-foreground-5 text-muted-foreground">
					<Icon aria-hidden="true" className="size-5" />
				</span>
				<h2 className="font-display text-[18px] font-medium text-foreground">{title}</h2>
				<p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
				{action ? (
					<button
						type="button"
						onClick={action.onClick}
						className="mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors duration-150 ease-out hover:bg-foreground/90"
					>
						{action.label}
						<span aria-hidden="true">→</span>
					</button>
				) : null}
			</div>
		</div>
	);
}
