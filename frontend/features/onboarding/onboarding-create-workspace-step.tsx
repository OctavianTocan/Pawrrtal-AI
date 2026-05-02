import { IconChevronRight, IconCloud, IconFolderPlus, IconWorld } from '@tabler/icons-react';
import type * as React from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface OnboardingCreateWorkspaceStepProps {
  titleId: string;
  onPickLocal: () => void;
}

/** Workspace type selection; only local is interactive (others are cosmetic). */
export function OnboardingCreateWorkspaceStep({
  titleId,
  onPickLocal,
}: OnboardingCreateWorkspaceStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8">
      <DialogHeader className="gap-2 text-left sm:pr-10">
        <DialogTitle id={titleId} className="text-lg font-semibold">
          Create workspace
        </DialogTitle>
        <DialogDescription>Initialize a new folder-based workspace.</DialogDescription>
      </DialogHeader>

      <ul className="flex flex-col gap-3">
        <li>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left',
              'bg-card ring-1 ring-foreground/10 transition-colors',
              'hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring'
            )}
            onClick={onPickLocal}
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
              aria-hidden
            >
              <IconFolderPlus className="size-5" stroke={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Local workspace</span>
              <span className="block text-sm text-muted-foreground">
                Create a workspace on this device.
              </span>
            </span>
            <IconChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </li>
        <li>
          <fieldset
            disabled
            className={cn(
              'm-0 min-w-0 border-0 p-0',
              'flex cursor-not-allowed items-center gap-4 rounded-2xl px-4 py-4 opacity-50',
              'bg-muted/30 ring-1 ring-foreground/5'
            )}
          >
            <legend className="sr-only">Connect custom remote — currently unavailable</legend>
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
              aria-hidden
            >
              <IconWorld className="size-5" stroke={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Connect custom remote</span>
              <span className="block text-sm text-muted-foreground">
                Attach to a self-hosted worker using a URL and access token.
              </span>
            </span>
            <IconChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </fieldset>
        </li>
        <li>
          <fieldset
            disabled
            className={cn(
              'm-0 min-w-0 border-0 p-0',
              'flex cursor-not-allowed items-center gap-4 rounded-2xl px-4 py-4 opacity-50',
              'bg-muted/30 ring-1 ring-foreground/5'
            )}
          >
            <legend className="sr-only">Shared workspaces — currently unavailable</legend>
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
              aria-hidden
            >
              <IconCloud className="size-5" stroke={1.5} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">Shared workspaces</span>
              <span className="block text-sm text-muted-foreground">
                Browse cloud workers shared with your organization and connect in one step.
              </span>
            </span>
            <IconChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </fieldset>
        </li>
      </ul>
    </div>
  );
}
