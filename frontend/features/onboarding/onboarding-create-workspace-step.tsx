import { IconChevronRight, IconCloud, IconFolderPlus, IconWorld } from '@tabler/icons-react';
import type * as React from 'react';
import { DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface OnboardingCreateWorkspaceStepProps {
  onPickLocal: () => void;
}

/** Workspace type selection; only local is interactive (others are cosmetic). */
export function OnboardingCreateWorkspaceStep({
  onPickLocal,
}: OnboardingCreateWorkspaceStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
      <DialogHeader className="gap-2.5 text-left sm:pr-12">
        <div
          className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.35rem]"
          aria-hidden="true"
        >
          Create workspace
        </div>
        <DialogDescription className="text-[0.9375rem] leading-relaxed text-muted-foreground">
          Initialize a new folder-based workspace.
        </DialogDescription>
      </DialogHeader>

      <ul className="flex flex-col gap-3.5">
        <li>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl px-4 py-5 text-left',
              'bg-card ring-1 ring-foreground/10 transition-colors',
              'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring'
            )}
            onClick={onPickLocal}
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground ring-1 ring-foreground/5"
              aria-hidden
            >
              <IconFolderPlus className="size-5" stroke={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Local workspace</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                Create a workspace on this device.
              </span>
            </span>
            <IconChevronRight className="size-5 shrink-0 text-muted-foreground/90" aria-hidden />
          </button>
        </li>
        <li>
          <fieldset
            disabled
            className={cn(
              'm-0 min-w-0 border-0 p-0',
              'flex cursor-not-allowed items-center gap-4 rounded-2xl px-4 py-5 opacity-55',
              'bg-muted/25 ring-1 ring-foreground/8'
            )}
          >
            <legend className="sr-only">Connect custom remote — currently unavailable</legend>
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"
              aria-hidden
            >
              <IconWorld className="size-5" stroke={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Connect custom remote</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                Attach to a self-hosted worker using a URL and access token.
              </span>
            </span>
            <IconChevronRight className="size-5 shrink-0 text-muted-foreground/80" aria-hidden />
          </fieldset>
        </li>
        <li>
          <fieldset
            disabled
            className={cn(
              'm-0 min-w-0 border-0 p-0',
              'flex cursor-not-allowed items-center gap-4 rounded-2xl px-4 py-5 opacity-55',
              'bg-muted/25 ring-1 ring-foreground/8'
            )}
          >
            <legend className="sr-only">Shared workspaces — currently unavailable</legend>
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"
              aria-hidden
            >
              <IconCloud className="size-5" stroke={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Shared workspaces</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
                Browse cloud workers shared with your organization and connect in one step.
              </span>
            </span>
            <IconChevronRight className="size-5 shrink-0 text-muted-foreground/80" aria-hidden />
          </fieldset>
        </li>
      </ul>
    </div>
  );
}
