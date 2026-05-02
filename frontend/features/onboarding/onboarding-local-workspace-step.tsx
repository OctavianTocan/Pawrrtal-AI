import { IconArrowLeft, IconCheck, IconFolder } from '@tabler/icons-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export interface OnboardingLocalWorkspaceStepProps {
  folderInputId: string;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  folderLabel: string | null;
  onFolderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectFolderClick: () => void;
  onBack: () => void;
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
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2 border-b border-border/80 px-4 py-5 sm:px-6 sm:py-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-0.5 shrink-0"
          onClick={onBack}
          aria-label="Back to workspace options"
        >
          <IconArrowLeft className="size-5" aria-hidden />
        </Button>
        <DialogHeader className="min-w-0 flex-1 gap-2 pr-10 text-left">
          <div className="text-xl font-semibold tracking-tight" aria-hidden="true">
            Local workspace
          </div>
          <DialogDescription className="text-[0.9375rem] leading-relaxed">
            Create a workspace on this device.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-8">
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
            webkitdirectory: true,
            directory: true,
          } as React.InputHTMLAttributes<HTMLInputElement>)}
        />

        <Card className="gap-0 overflow-hidden border-0 bg-muted/30 py-0 shadow-none ring-1 ring-foreground/10">
          <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold tracking-tight">Pick a folder</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              This folder becomes your workspace. AI Nexus will be able to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5 sm:px-6">
            <ul className="list-none space-y-2.5 text-sm leading-relaxed text-foreground">
              <li className="flex items-start gap-3">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-success" stroke={2} aria-hidden />
                <span>Read files you put in there</span>
              </li>
              <li className="flex items-start gap-3">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-success" stroke={2} aria-hidden />
                <span>Create and edit files for you</span>
              </li>
              <li className="flex items-start gap-3">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-success" stroke={2} aria-hidden />
                <span>Work with spreadsheets, docs, images — anything in the folder</span>
              </li>
            </ul>
            <p className="text-xs italic leading-relaxed text-muted-foreground">
              Drop files in anytime and AI Nexus can pick them up.
            </p>

            <div className="space-y-3 border-t border-border/50 pt-5">
              <div
                className="rounded-full bg-background/80 px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10"
                aria-live="polite"
              >
                {folderLabel ?? 'No folder selected yet.'}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 rounded-2xl border-border/80 bg-background/50 font-medium"
                onClick={onSelectFolderClick}
              >
                <IconFolder className="size-4" aria-hidden />
                Select folder
              </Button>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="mt-1 gap-3 border-t border-border/80 pt-6 sm:justify-end">
          <Button type="button" variant="outline" className="min-w-[6.5rem]" onClick={onFinish}>
            Cancel
          </Button>
          <Button type="button" className="min-w-[10rem] font-semibold" onClick={onFinish}>
            Create Workspace
          </Button>
        </DialogFooter>
      </div>
    </div>
  );
}
