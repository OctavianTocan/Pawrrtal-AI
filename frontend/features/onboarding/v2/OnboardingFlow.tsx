'use client';

import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OnboardingBackdrop } from '@/features/onboarding/OnboardingBackdrop';
import {
	useGetPersonalization,
	useUpsertPersonalization,
} from '@/features/personalization/hooks/use-personalization';
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
	const remotePersonalization = useGetPersonalization();
	const upsertPersonalization = useUpsertPersonalization();
	// Seed from localStorage on first render so the form has data to
	// display before the React Query GET resolves. Once the remote
	// profile arrives, hydrate over the local copy below in an effect.
	const [profile, setProfile] = useState<PersonalizationProfile>(() =>
		loadPersonalizationProfile()
	);

	// Hydrate from the backend the first time it arrives + on every
	// subsequent refetch — keeps local state aligned with persisted state
	// after the user navigates away and comes back.
	useEffect(() => {
		if (remotePersonalization.data) {
			setProfile(remotePersonalization.data);
		}
	}, [remotePersonalization.data]);

	/**
	 * Persist on every patch.
	 *
	 * Two-channel write: localStorage stays the synchronous draft buffer
	 * (so a refresh during the session never loses the user's work even
	 * if the backend is down) and the backend PUT is the source of truth.
	 * Both writes are fire-and-forget — the form treats success as the
	 * default and only surfaces backend failures as a toast through the
	 * mutation's error path (handled in the calling component / hook).
	 */
	const patchProfile = useCallback(
		(patch: Partial<PersonalizationProfile>): void => {
			setProfile((current) => {
				const next = { ...current, ...patch };
				savePersonalizationProfile(next);
				upsertPersonalization.mutate(next);
				return next;
			});
		},
		[upsertPersonalization]
	);

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
