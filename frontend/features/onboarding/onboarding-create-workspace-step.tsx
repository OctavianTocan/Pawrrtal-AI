import { CloudServerIcon, FolderAddIcon, FolderOpenIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type * as React from 'react';
import { DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const WORKSPACE_OPTIONS = [
  {
    icon: FolderAddIcon,
    title: 'Create new',
    description: 'Start fresh with an empty workspace.',
    status: 'upcoming',
  },
  {
    icon: FolderOpenIcon,
    title: 'Open folder',
    description: 'Choose an existing folder as workspace.',
    status: 'enabled',
  },
  {
    icon: CloudServerIcon,
    title: 'Connect to remote server',
    description: 'Use a remote AI Nexus worker.',
    status: 'upcoming',
  },
] as const;

/** Props for the workspace selection step. */
export interface OnboardingCreateWorkspaceStepProps {
  /** Opens the local folder selection step. */
  onPickLocal: () => void;
}

/** Workspace type selection; only folder opening is interactive until backend support exists. */
export function OnboardingCreateWorkspaceStep({
  onPickLocal,
}: OnboardingCreateWorkspaceStepProps): React.JSX.Element {
  return (
    <section className="popover-styled onboarding-panel flex w-full max-w-[34rem] select-none flex-col gap-6 rounded-xl border border-white/8 bg-[#11161c]/95 px-7 py-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_54px_rgba(0,0,0,0.32)] sm:px-8 sm:py-9">
      <DialogHeader className="items-center gap-2 text-center">
        <div
          className="text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]"
          aria-hidden="true"
        >
          Add Workspace...
        </div>
        <DialogDescription className="text-[0.9375rem] leading-relaxed text-white/55">
          Where your ideas meet the tools to make them happen.
        </DialogDescription>
      </DialogHeader>

      <ul className="flex flex-col gap-2">
        {WORKSPACE_OPTIONS.map((option): React.JSX.Element => {
          const Icon = option.icon;
          const isEnabled = option.status === 'enabled';

          return (
            <li key={option.title}>
              <button
                type="button"
                className={cn(
                  'flex min-h-[4.75rem] w-full items-center gap-4 rounded-xl px-4 text-left',
                  'bg-white/[0.025] ring-1 ring-white/10 transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]',
                  isEnabled
                    ? 'cursor-pointer hover:bg-white/[0.045] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:ring-white/16 active:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-white/45'
                    : 'cursor-not-allowed bg-white/[0.012] text-white/32 ring-white/[0.055]'
                )}
                onClick={isEnabled ? onPickLocal : undefined}
                aria-disabled={!isEnabled}
                disabled={!isEnabled}
                tabIndex={isEnabled ? 0 : -1}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1',
                    isEnabled
                      ? 'bg-white/[0.04] text-white/64 ring-white/8'
                      : 'bg-white/[0.018] text-white/26 ring-white/[0.045]'
                  )}
                  aria-hidden="true"
                >
                  <HugeiconsIcon icon={Icon} size={20} strokeWidth={1.65} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-base font-semibold',
                      isEnabled ? 'text-white' : 'text-white/38'
                    )}
                  >
                    {option.title}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-sm leading-snug',
                      isEnabled ? 'text-white/52' : 'text-white/28'
                    )}
                  >
                    {option.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
