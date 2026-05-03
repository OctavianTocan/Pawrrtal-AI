import { ArrowLeft02Icon, FolderCheckIcon, FolderOpenIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Props for the existing-folder onboarding step. */
export interface OnboardingLocalWorkspaceStepProps {
  /** Input id used by the hidden folder picker and label. */
  folderInputId: string;
  /** Ref for imperatively opening the browser folder picker. */
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  /** Human-readable selected folder label. */
  folderLabel: string | null;
  /** Handles changes from the hidden folder picker input. */
  onFolderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Opens the hidden folder picker input. */
  onSelectFolderClick: () => void;
  /** Returns to the workspace option step. */
  onBack: () => void;
  /** Finishes or dismisses onboarding. */
  onFinish: () => void;
}

/**
 * Cosmetic local workspace step — folder selection is UI-only until backend support exists.
 */
export function OnboardingLocalWorkspaceStep({
  folderInputId,
  folderInputRef,
  folderLabel,
  onFolderChange,
  onSelectFolderClick,
  onBack,
  onFinish,
}: OnboardingLocalWorkspaceStepProps): React.JSX.Element {
  const isFolderSelected = Boolean(folderLabel);

  return (
    <section className="popover-styled onboarding-panel flex w-full max-w-[32rem] select-none flex-col gap-6 rounded-xl border border-white/8 bg-[#11161c]/95 p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_54px_rgba(0,0,0,0.32)] sm:p-7">
      <button
        type="button"
        className="-ml-1 flex h-8 w-fit cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-white/52 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-white/[0.045] hover:text-white active:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-white/45"
        onClick={onBack}
        aria-label="Back to workspace options"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={1.7} aria-hidden="true" />
        <span>Back</span>
      </button>

      <DialogHeader className="gap-2 text-left">
        <div
          className="text-[1.375rem] font-semibold leading-tight tracking-tight text-white"
          aria-hidden="true"
        >
          Choose folder
        </div>
        <DialogDescription className="max-w-[26rem] text-[0.9375rem] leading-relaxed text-white/55">
          Pick the folder AI Nexus can use as this workspace.
        </DialogDescription>
      </DialogHeader>

      {/*
        Cosmetic folder picker only — full workspace paths / persistence are future work.
      */}
      <Label htmlFor={folderInputId} className="sr-only">
        Workspace folder
      </Label>
      <input
        ref={folderInputRef}
        id={folderInputId}
        type="file"
        className="sr-only"
        multiple
        onChange={onFolderChange}
        tabIndex={-1}
        {...({
          webkitdirectory: '',
          directory: '',
        } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      <div
        className={cn(
          'flex min-h-[6.75rem] w-full select-none items-center gap-4 rounded-lg px-4 text-left ring-1',
          isFolderSelected
            ? 'bg-white/[0.045] ring-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'bg-white/[0.025] ring-white/10'
        )}
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors duration-200',
            isFolderSelected
              ? 'bg-white/[0.09] text-white ring-white/14'
              : 'bg-white/[0.04] text-white/58 ring-white/8'
          )}
        >
          {isFolderSelected ? (
            <HugeiconsIcon icon={FolderCheckIcon} size={20} strokeWidth={1.7} aria-hidden="true" />
          ) : (
            <HugeiconsIcon icon={FolderOpenIcon} size={20} strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1" aria-live="polite">
          <span className="block truncate text-[0.9375rem] font-medium text-white">
            {folderLabel ?? 'Select a workspace folder'}
          </span>
          <span className="mt-1 block text-sm leading-5 text-white/50">
            {isFolderSelected
              ? 'Ready to open as your workspace.'
              : 'Browse your computer and choose the folder to use.'}
          </span>
        </span>
        <button
          type="button"
          className="inline-flex shrink-0 cursor-pointer rounded-lg bg-white/[0.045] px-3 py-2 text-sm font-medium text-white/76 ring-1 ring-white/10 transition-[background-color,color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/45"
          onClick={onSelectFolderClick}
        >
          Browse
        </button>
      </div>

      <Button
        type="button"
        className="h-10 w-full cursor-pointer rounded-lg bg-white/86 text-sm font-semibold text-[#11161c] shadow-none transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18)] active:bg-white/80 disabled:cursor-not-allowed disabled:bg-white/[0.09] disabled:text-white/34"
        onClick={onFinish}
        disabled={!isFolderSelected}
      >
        {isFolderSelected ? 'Open workspace' : 'Select a folder first'}
      </Button>
    </section>
  );
}
