'use client';

import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OnboardingBackdrop } from '@/features/onboarding/OnboardingBackdrop';
import {
	loadPersonalizationProfile,
	type PersonalizationProfile,
	savePersonalizationProfile,
} from '@/features/personalization/storage';
import { StepContext } from './step-context';
import { StepIdentity } from './step-identity';
import { StepMessaging } from './step-messaging';
import { StepPersonality } from './step-personality';

/** Browser event used by app chrome to open the onboarding flow. */
export const OPEN_ONBOARDING_FLOW_EVENT = 'ai-nexus:open-onboarding-flow';

/** Wizard step IDs in render order. */
const STEP_IDS = ['identity', 'context', 'personality', 'messaging'] as const;
type StepId = (typeof STEP_IDS)[number];

/** Props for {@link OnboardingFlow}. */
export interface OnboardingFlowProps {
	/** Open on first mount. Defaults to false (event-driven). */
	initialOpen?: boolean;
	/** Listen for the OPEN_ONBOARDING_FLOW_EVENT to open. Defaults to true. */
	listenForOpenEvent?: boolean;
}

/**
 * Four-step onboarding wizard mounted once at app-layout level.
 *
 * Steps: Identity → Context → Personality → Connect Messaging.
 *
 * Stays closed until either `initialOpen` is true OR the
 * `OPEN_ONBOARDING_FLOW_EVENT` is dispatched (the workspace selector's
 * "Add Workspace" item dispatches it).
 *
 * The personalization answers persist to localStorage under the same
 * key the Settings → Personalization section reads, so changes round-trip.
 */
export function OnboardingFlow({
	initialOpen = false,
	listenForOpenEvent = true,
}: OnboardingFlowProps): React.JSX.Element {
	const [open, setOpen] = useState(initialOpen);
	const [step, setStep] = useState<StepId>('identity');
	const [profile, setProfile] = useState<PersonalizationProfile>(() =>
		loadPersonalizationProfile()
	);

	// Persist on every patch — no Save button; the user expects partial
	// progress to round-trip if they back out and re-open.
	const patchProfile = useCallback((patch: Partial<PersonalizationProfile>): void => {
		setProfile((current) => {
			const next = { ...current, ...patch };
			savePersonalizationProfile(next);
			return next;
		});
	}, []);

	const goNext = useCallback(() => {
		const index = STEP_IDS.indexOf(step);
		const nextStep = STEP_IDS[Math.min(STEP_IDS.length - 1, index + 1)];
		setStep(nextStep ?? step);
	}, [step]);

	const finish = useCallback(() => {
		setOpen(false);
		// Reset to step 1 so re-opening from the workspace selector starts
		// fresh — without this the user would land on whatever step they
		// last left off, which is jarring for a "new workspace" intent.
		setStep('identity');
	}, []);

	useEffect(() => {
		if (!listenForOpenEvent) return;
		const handler = (): void => {
			setStep('identity');
			setProfile(loadPersonalizationProfile());
			setOpen(true);
		};
		window.addEventListener(OPEN_ONBOARDING_FLOW_EVENT, handler);
		return () => window.removeEventListener(OPEN_ONBOARDING_FLOW_EVENT, handler);
	}, [listenForOpenEvent]);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogContent className="top-0 left-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none ring-0 sm:max-w-none sm:p-0 [&>button]:top-6 [&>button]:right-6 [&>button]:z-30 [&>button]:rounded-xl [&>button]:bg-foreground/[0.035] [&>button]:text-muted-foreground [&>button]:ring-1 [&>button]:ring-border [&>button]:hover:bg-foreground/[0.07] [&>button]:hover:text-foreground">
				<DialogTitle className="sr-only">Onboarding</DialogTitle>
				<OnboardingBackdrop />
				<div className="relative z-10 grid min-h-[100dvh] place-items-center px-5 py-20 sm:px-8">
					{step === 'identity' ? (
						<StepIdentity
							onContinue={goNext}
							onPatch={patchProfile}
							profile={profile}
						/>
					) : null}
					{step === 'context' ? (
						<StepContext
							onContinue={goNext}
							onPatch={patchProfile}
							onSkip={goNext}
							profile={profile}
						/>
					) : null}
					{step === 'personality' ? (
						<StepPersonality
							onContinue={goNext}
							onPatch={patchProfile}
							profile={profile}
						/>
					) : null}
					{step === 'messaging' ? (
						<StepMessaging onFinish={finish} onPatch={patchProfile} profile={profile} />
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
