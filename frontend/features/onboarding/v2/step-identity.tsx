'use client';

import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PersonalizationProfile } from '@/features/personalization/storage';
import { cn } from '@/lib/utils';
import { OnboardingShell } from './onboarding-shell';

/** Goal chips shown at the bottom of step 1. */
const GOAL_CHIPS = [
	'SEO / AEO',
	'Generate Leads',
	'Nurture Leads',
	'Run My Outbound',
	'Handle Support',
	'Personal Assistant',
	'Run Ads',
	'Writing',
] as const;

/** Props for {@link StepIdentity}. */
export interface StepIdentityProps {
	profile: PersonalizationProfile;
	onPatch: (patch: Partial<PersonalizationProfile>) => void;
	onContinue: () => void;
}

/**
 * Step 1 — basic identity capture.
 *
 * Fields: name, company website, linkedin (optional), role, goal chips.
 * Continues regardless of completeness; we treat onboarding as a soft
 * gate, not a wall.
 */
export function StepIdentity({
	profile,
	onPatch,
	onContinue,
}: StepIdentityProps): React.JSX.Element {
	const goals = profile.goals ?? [];

	const toggleGoal = (goal: string): void => {
		const next = goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal];
		onPatch({ goals: next });
	};

	return (
		<OnboardingShell
			footer={
				<Button className="w-full max-w-xs" onClick={onContinue} type="button">
					Continue →
				</Button>
			}
			subtitle="We'll use this to personalize your agent."
			title="Let's get to know you"
		>
			<Field label="Your name">
				<Input
					onChange={(event) => onPatch({ name: event.target.value })}
					placeholder="Your name"
					value={profile.name ?? ''}
				/>
			</Field>
			<Field label="Company website">
				<Input
					onChange={(event) => onPatch({ companyWebsite: event.target.value })}
					placeholder="https://yourcompany.com"
					value={profile.companyWebsite ?? ''}
				/>
			</Field>
			<Field helper="Optional — helps personalize your agent" label="Your LinkedIn profile">
				<Input
					onChange={(event) => onPatch({ linkedin: event.target.value })}
					placeholder="https://linkedin.com/in/yourname"
					value={profile.linkedin ?? ''}
				/>
			</Field>
			<Field label="Your role">
				<Input
					onChange={(event) => onPatch({ role: event.target.value })}
					placeholder="e.g. Founder, Engineering"
					value={profile.role ?? ''}
				/>
			</Field>
			<div className="flex flex-col gap-2">
				<span className="text-xs font-medium text-foreground">
					What do you want to accomplish?
				</span>
				<div className="flex flex-wrap gap-2">
					{GOAL_CHIPS.map((goal) => {
						const isOn = goals.includes(goal);
						return (
							<button
								className={cn(
									'rounded-full border px-3 py-1 text-xs transition-colors',
									isOn
										? 'border-foreground bg-foreground text-background'
										: 'border-foreground/15 bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06]'
								)}
								key={goal}
								onClick={() => toggleGoal(goal)}
								type="button"
							>
								{goal}
							</button>
						);
					})}
				</div>
			</div>
		</OnboardingShell>
	);
}

/** Small label-over-input wrapper used throughout step 1. */
function Field({
	label,
	helper,
	children,
}: {
	label: React.ReactNode;
	helper?: React.ReactNode;
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs font-medium text-foreground">{label}</span>
			{children}
			{helper ? <span className="text-[11px] text-muted-foreground">{helper}</span> : null}
		</div>
	);
}
