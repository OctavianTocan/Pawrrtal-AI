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
 * Visual shell shared by every step in the v2 onboarding flow.
 *
 * Centers the content vertically over the existing `OnboardingBackdrop`
 * and applies the rounded-card chrome the reference screenshots use.
 * Each step's body controls its own internal scrolling.
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
				'mx-auto flex w-full max-w-[40rem] flex-col gap-6 px-4 text-center text-foreground',
				className
			)}
		>
			<header className="flex flex-col items-center gap-2">
				<h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
				{subtitle ? (
					<p className="max-w-md text-sm text-muted-foreground">{subtitle}</p>
				) : null}
			</header>
			<div className="flex flex-col gap-4 text-left">{children}</div>
			{footer ? <div className="flex flex-col items-center gap-2 pt-2">{footer}</div> : null}
		</div>
	);
}
