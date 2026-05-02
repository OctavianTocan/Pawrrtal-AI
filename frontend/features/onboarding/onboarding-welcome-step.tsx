import {
  IconFileText,
  IconFolder,
  IconPlug,
  IconRobot,
  IconTable,
  IconWorld,
} from '@tabler/icons-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const FEATURE_ITEMS = [
  {
    icon: IconTable,
    title: 'Edit spreadsheets',
    description: 'Create, clean, and transform CSV and Excel files.',
  },
  {
    icon: IconWorld,
    title: 'Control your browser',
    description: 'Automate Chrome for repetitive web tasks.',
  },
  {
    icon: IconFolder,
    title: 'Organize files',
    description: 'Read, write, and manage files and folders.',
  },
  {
    icon: IconRobot,
    title: 'Automate tasks',
    description: 'Build reusable workflows with skills and commands.',
  },
  {
    icon: IconFileText,
    title: 'Generate content',
    description: 'Draft documents, emails, and reports.',
  },
  {
    icon: IconPlug,
    title: 'Connect to APIs',
    description: 'Plug into external services and tools via MCP.',
  },
] as const;

export interface OnboardingWelcomeStepProps {
  /** Stable id wiring for `aria-labelledby` on the dialog surface. */
  titleId: string;
  /** Advances to the create-workspace step. */
  onContinue: () => void;
}

/** First onboarding screen: hero, feature grid, primary CTA. */
export function OnboardingWelcomeStep({
  titleId,
  onContinue,
}: OnboardingWelcomeStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8 p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/25"
          aria-hidden
        >
          <IconRobot className="size-8" stroke={1.5} />
        </div>
        <DialogHeader className="gap-2 sm:text-center">
          <DialogTitle id={titleId} className="text-balance text-xl font-semibold sm:text-2xl">
            Welcome to AI Nexus
          </DialogTitle>
          <DialogDescription className="text-base">
            Your AI workspace for shipping faster—with clarity.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
        {FEATURE_ITEMS.map((item) => (
          <Card key={item.title} size="sm" className="gap-0 py-4 shadow-none">
            <CardHeader className="items-center space-y-3 px-4 pb-2 text-center">
              <item.icon className="size-8 text-muted-foreground" stroke={1.5} aria-hidden />
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <CardDescription className="text-xs leading-snug">{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full rounded-full text-base font-medium"
        onClick={onContinue}
      >
        Get started
      </Button>
    </div>
  );
}
