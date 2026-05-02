'use client';

import type * as React from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnboardingCreateWorkspaceStep } from '@/features/onboarding/onboarding-create-workspace-step';
import { OnboardingLocalWorkspaceStep } from '@/features/onboarding/onboarding-local-workspace-step';
import { OnboardingWelcomeStep } from '@/features/onboarding/onboarding-welcome-step';
import { cn } from '@/lib/utils';

/** Wizard steps for the cosmetic onboarding dialog (no persisted workspace). */
type OnboardingStep = 'welcome' | 'create' | 'local';

/**
 * Three-step onboarding modal (Welcome → Create workspace → Local workspace).
 * Cosmetic only: no workspace or folder path is persisted (see future backend work).
 */
export function OnboardingModal(): React.JSX.Element {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderInputId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(true);
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

  const dialogMaxClass =
    step === 'welcome' ? 'max-h-[min(90vh,860px)] overflow-y-auto sm:max-w-4xl' : 'sm:max-w-lg';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('gap-0 p-0 sm:p-0', dialogMaxClass)} aria-labelledby={titleId}>
        {step === 'welcome' ? (
          <OnboardingWelcomeStep titleId={titleId} onContinue={() => setStep('create')} />
        ) : null}
        {step === 'create' ? (
          <OnboardingCreateWorkspaceStep titleId={titleId} onPickLocal={() => setStep('local')} />
        ) : null}
        {step === 'local' ? (
          <OnboardingLocalWorkspaceStep
            titleId={titleId}
            folderInputId={folderInputId}
            folderInputRef={folderInputRef}
            folderLabel={folderLabel}
            onFolderChange={handleFolderChange}
            onSelectFolderClick={handleSelectFolderClick}
            onBack={() => setStep('create')}
            onFinish={handleFinish}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
