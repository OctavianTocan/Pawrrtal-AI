'use client';

import type * as React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OnboardingBackdrop } from '@/features/onboarding/OnboardingBackdrop';
import { OnboardingCreateWorkspaceStep } from '@/features/onboarding/onboarding-create-workspace-step';
import { OnboardingLocalWorkspaceStep } from '@/features/onboarding/onboarding-local-workspace-step';
import { OnboardingWelcomeStep } from '@/features/onboarding/onboarding-welcome-step';

/** Wizard steps for the cosmetic onboarding dialog (no persisted workspace). */
type OnboardingStep = 'welcome' | 'create' | 'local';

/** Browser event used by app chrome to reopen the cosmetic onboarding flow. */
export const OPEN_ONBOARDING_EVENT = 'pawrrtal:open-onboarding';

/** Props for the onboarding modal host. */
export interface OnboardingModalProps {
	/** Whether the modal should be open on first mount. */
	initialOpen?: boolean;
	/** Whether this instance should listen for app chrome requests to reopen onboarding. */
	listenForOpenEvent?: boolean;
}

/**
 * Three-step onboarding modal (Welcome → Create workspace → Local workspace).
 * Cosmetic only: no workspace or folder path is persisted (see future backend work).
 */
export function OnboardingModal({
	initialOpen = true,
	listenForOpenEvent = true,
}: OnboardingModalProps): React.JSX.Element {
	const folderInputRef = useRef<HTMLInputElement>(null);
	const folderInputId = useId();
	const [open, setOpen] = useState(initialOpen);
	const [step, setStep] = useState<OnboardingStep>('welcome');
	const [folderLabel, setFolderLabel] = useState<string | null>(null);

	const handleOpenChange = useCallback((next: boolean) => {
		setOpen(next);
	}, []);

	const handleFolderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		const first = files?.[0];
		if (!first) {
			return;
		}
		const relative = first.webkitRelativePath;
		const nameFromPath = relative.includes('/') ? relative.split('/')[0] : null;
		setFolderLabel(nameFromPath ?? first.name ?? 'Selected folder');
	}, []);

	const handleSelectFolderClick = useCallback(() => {
		folderInputRef.current?.click();
	}, []);

	const handleFinish = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		if (!listenForOpenEvent) {
			return undefined;
		}

		const handleOpenOnboarding = (): void => {
			setStep('welcome');
			setFolderLabel(null);
			setOpen(true);
		};

		window.addEventListener(OPEN_ONBOARDING_EVENT, handleOpenOnboarding);

		return (): void => {
			window.removeEventListener(OPEN_ONBOARDING_EVENT, handleOpenOnboarding);
		};
	}, [listenForOpenEvent]);

	const accessibleTitle =
		step === 'welcome'
			? 'Welcome to Pawrrtal'
			: step === 'create'
				? 'Create workspace'
				: 'Local workspace';

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="top-0 left-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none ring-0 sm:max-w-none sm:p-0 [&>button]:top-6 [&>button]:right-6 [&>button]:z-30 [&>button]:rounded-control [&>button]:bg-foreground/[0.035] [&>button]:text-muted-foreground [&>button]:ring-1 [&>button]:ring-border [&>button]:hover:bg-foreground/[0.07] [&>button]:hover:text-foreground">
				{/*
          Radix requires DialogTitle inside DialogContent. Do not set aria-labelledby / id with
          useId() — Radix dev TitleWarning uses document.getElementById and can false-positive when
          ids are wired manually; DialogTitle wires aria-labelledby via context automatically.
        */}
				<DialogTitle className="sr-only">{accessibleTitle}</DialogTitle>
				<OnboardingBackdrop />
				<div className="relative z-10 grid min-h-[100dvh] place-items-center px-5 py-20 sm:px-8">
					{step === 'welcome' ? (
						<OnboardingWelcomeStep onContinue={() => setStep('create')} />
					) : null}
					{step === 'create' ? (
						<OnboardingCreateWorkspaceStep onPickLocal={() => setStep('local')} />
					) : null}
					{step === 'local' ? (
						<OnboardingLocalWorkspaceStep
							folderInputId={folderInputId}
							folderInputRef={folderInputRef}
							folderLabel={folderLabel}
							onFolderChange={handleFolderChange}
							onSelectFolderClick={handleSelectFolderClick}
							onBack={() => setStep('create')}
							onFinish={handleFinish}
						/>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
