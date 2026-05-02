import { IconArrowLeft, IconCheck, IconFolder } from '@tabler/icons-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export interface OnboardingLocalWorkspaceStepProps {
  titleId: string;
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
  titleId,
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
      <div className="flex items-start gap-2 border-b border-border/80 p-4 sm:p-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onBack}
          aria-label="Back to workspace options"
        >
          <IconArrowLeft className="size-5" aria-hidden />
        </Button>
        <DialogHeader className="min-w-0 flex-1 gap-2 pr-10 text-left">
          <DialogTitle id={titleId} className="text-lg font-semibold">
            Local workspace
          </DialogTitle>
          <DialogDescription>Create a workspace on this device.</DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex flex-col gap-6 p-6 sm:p-8">
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

        <Card className="gap-4 py-5 shadow-none ring-foreground/10">
          <CardHeader className="space-y-1 px-5 pb-0">
            <CardTitle className="text-base font-semibold">Pick a folder</CardTitle>
            <CardDescription>
              This folder becomes your workspace. AI Nexus will be able to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5">
            <ul className="list-none space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-success" stroke={2} aria-hidden />
                <span>Read files you put in there</span>
              </li>
              <li className="flex items-start gap-2">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-success" stroke={2} aria-hidden />
                <span>Create and edit files for you</span>
              </li>
              <li className="flex items-start gap-2">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-success" stroke={2} aria-hidden />
                <span>Work with spreadsheets, docs, images — anything in the folder</span>
              </li>
            </ul>
            <p className="text-xs italic text-muted-foreground">
              Drop files in anytime and AI Nexus can pick them up.
            </p>

            <div className="space-y-3 pt-1">
              <div
                className="rounded-full bg-muted/80 px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-foreground/10"
                aria-live="polite"
              >
                {folderLabel ?? 'No folder selected yet.'}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 rounded-2xl"
                onClick={onSelectFolderClick}
              >
                <IconFolder className="size-4" aria-hidden />
                Select folder
              </Button>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onFinish}>
            Cancel
          </Button>
          <Button type="button" onClick={onFinish}>
            Create Workspace
          </Button>
        </DialogFooter>
      </div>
    </div>
  );
}
