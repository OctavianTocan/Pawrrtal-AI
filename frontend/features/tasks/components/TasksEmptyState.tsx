
/**
 * Centered editorial empty state for any Tasks sub-view.
 *
 * Uses Newsreader display type for the headline so an empty Today doesn't
 * read as a broken page — it reads as a moment of quiet. The optional CTA
 * stays low-key (foreground fill, no accent) so the message stays primary.
 */

import type { ComponentType, ReactNode, SVGProps } from 'react';

export interface TasksEmptyStateProps {
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

/**
 * Pure presentation. The container picks copy + CTA; this component never
 * reads any state of its own.
 */
export function TasksEmptyState({
	icon: Icon,
	title,
	description,
	action,
}: TasksEmptyStateProps): ReactNode {
	return (
		<div className="flex h-full w-full items-center justify-center px-6 py-10">
			<div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
				<span className="flex size-12 items-center justify-center rounded-full bg-foreground/[0.05] text-muted-foreground">
					<Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
				</span>
				<h2 className="font-display text-[28px] leading-tight font-medium tracking-[-0.02em] text-balance text-foreground">
					{title}
				</h2>
				<p className="text-[14px] leading-relaxed text-pretty text-muted-foreground">
					{description}
				</p>
				{action ? (
					<button
						type="button"
						onClick={action.onClick}
						className="mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-[background-color,transform] duration-150 ease-out hover:bg-foreground/90 active:scale-[0.98] motion-reduce:transition-none"
					>
						{action.label}
						<span aria-hidden="true">→</span>
					</button>
				) : null}
			</div>
		</div>
	);
}
