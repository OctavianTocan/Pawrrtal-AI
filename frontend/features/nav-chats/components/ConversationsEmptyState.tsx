import type { ReactNode } from 'react';

interface ConversationsEmptyStateProps {
	/** Icon rendered inside a subtle container above the title. */
	icon: ReactNode;
	/** Primary heading text. */
	title: string;
	/** Secondary description shown below the heading. */
	description: string;
	/** Optional CTA button label. Omit to hide the button. */
	buttonLabel?: string;
	/** Called when the CTA button is clicked. Required when `buttonLabel` is set. */
	onAction?: () => void;
}

/**
 * Centred empty-state placeholder for the conversations sidebar.
 *
 * Used for both the "no sessions yet" and "no search results" states.
 * Optionally renders a call-to-action button when `buttonLabel` is provided.
 */
export function ConversationsEmptyState({
	icon,
	title,
	description,
	buttonLabel,
	onAction,
}: ConversationsEmptyStateProps): React.JSX.Element {
	return (
		<div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
			<div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-foreground/[0.03] text-muted-foreground/70 shadow-minimal">
				{icon}
			</div>
			<h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
			<p className="mt-1.5 max-w-[220px] text-xs leading-5 text-muted-foreground">
				{description}
			</p>
			{buttonLabel && onAction ? (
				<button
					type="button"
					onClick={onAction}
					className="mt-4 inline-flex items-center h-7 px-3 text-xs font-medium rounded-[8px] bg-background shadow-minimal hover:bg-foreground/[0.03] transition-colors"
				>
					{buttonLabel}
				</button>
			) : null}
		</div>
	);
}
