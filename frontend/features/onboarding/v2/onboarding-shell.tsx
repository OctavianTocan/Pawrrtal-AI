'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

/** Props for the shared onboarding step container. */
export interface OnboardingShellProps {
	/** Step heading. */
	title: React.ReactNode;
	/** Helper text under the heading. */
	subtitle?: React.ReactNode;
	/** Step body — typically a stack of inputs/cards. */
	children: React.ReactNode;
	/** Optional footer (Continue / Skip / Connect / etc). */
	footer?: React.ReactNode;
	/** Override max-width on the inner card. */
	className?: string;
}

/**
 * Visual shell shared by every step in the personalization onboarding
 * flow.
 *
 * Per DESIGN.md → Components → personalization-modal, the body is
 * wrapped in a panel that mirrors the workspace onboarding card —
 * `bg-background/95`, `border border-border`, `rounded-xl`,
 * `shadow-modal-small`. Field typography uses the same tokens as the
 * workspace flow (h3-equivalent heading, body-md helper, body-sm field
 * labels) so the two surfaces feel like one design language.
 *
 * The footer (Continue button etc.) sits **below** the panel so it
 * matches the workspace modal pattern where the primary CTA is the
 * last full-width control under the card.
 */
export function OnboardingShell({
	title,
	subtitle,
	children,
	footer,
	className,
}: OnboardingShellProps): React.JSX.Element {
	return (
		<div
			className={cn(
				'mx-auto flex w-full max-w-[37rem] flex-col gap-6 text-foreground',
				className
			)}
		>
			<section className="popover-styled onboarding-panel flex w-full select-none flex-col gap-7 rounded-xl border border-border bg-background/95 px-7 py-8 shadow-modal-small sm:px-8 sm:py-9">
				<header className="flex flex-col items-center gap-2 text-center">
					<h2 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
						{title}
					</h2>
					{subtitle ? (
						<p className="max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
							{subtitle}
						</p>
					) : null}
				</header>
				<div className="flex flex-col gap-5 text-left">{children}</div>
			</section>
			{footer ? <div className="flex flex-col items-center gap-2">{footer}</div> : null}
		</div>
	);
}
