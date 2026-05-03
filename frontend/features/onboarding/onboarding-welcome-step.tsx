import {
  FileSpreadsheetIcon,
  Folder01Icon,
  GlobeIcon,
  WorkflowSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader } from '@/components/ui/dialog';

const FEATURE_ITEMS = [
  {
    icon: FileSpreadsheetIcon,
    title: 'Edit spreadsheets',
    description: 'Create, clean, and transform CSV and Excel files.',
  },
  {
    icon: GlobeIcon,
    title: 'Control your browser',
    description: 'Automate Chrome for repetitive web tasks.',
  },
  {
    icon: Folder01Icon,
    title: 'Organize files',
    description: 'Read, write, and manage files and folders.',
  },
  {
    icon: WorkflowSquare01Icon,
    title: 'Run agents',
    description: 'Turn repeatable work into durable commands.',
  },
] as const;

/** Props for the onboarding welcome step. */
export interface OnboardingWelcomeStepProps {
  /** Advances to the create-workspace step. */
  onContinue: () => void;
}

/** First onboarding screen: hero, feature grid, primary CTA. */
export function OnboardingWelcomeStep({
  onContinue,
}: OnboardingWelcomeStepProps): React.JSX.Element {
  return (
    <section className="popover-styled onboarding-panel flex w-full max-w-[37rem] select-none flex-col gap-7 rounded-xl border border-white/8 bg-[#11161c]/95 px-7 py-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_54px_rgba(0,0,0,0.32)] sm:px-8 sm:py-9">
      <div className="flex flex-col gap-4 text-left">
        <DialogHeader className="gap-2 text-left">
          <div
            className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]"
            aria-hidden="true"
          >
            Welcome to AI Nexus
          </div>
          <DialogDescription className="max-w-[30rem] text-[0.9375rem] leading-relaxed text-white/52">
            Your computer, but it works for you.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURE_ITEMS.map((item): React.JSX.Element => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex min-h-[6rem] items-start gap-3 rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/8 transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            >
              <span
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-white/62 ring-1 ring-white/8"
                aria-hidden="true"
              >
                <HugeiconsIcon icon={Icon} size={20} strokeWidth={1.65} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-sm leading-snug text-white/50">
                  {item.description}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full cursor-pointer rounded-xl bg-white/88 px-8 text-sm font-semibold text-[#11161c] shadow-none transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.22)] active:bg-white/80"
        onClick={onContinue}
      >
        Get started
      </Button>
    </section>
  );
}
