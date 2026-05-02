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
import { DialogDescription, DialogHeader } from '@/components/ui/dialog';

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
  /** Advances to the create-workspace step. */
  onContinue: () => void;
}

/** First onboarding screen: hero, feature grid, primary CTA. */
export function OnboardingWelcomeStep({
  onContinue,
}: OnboardingWelcomeStepProps): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 pt-8 pb-10 sm:gap-12 sm:px-10 sm:pt-10 sm:pb-12">
      <div className="flex flex-col items-center gap-5 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-2xl bg-muted/90 text-accent ring-1 ring-foreground/15"
          aria-hidden
        >
          <IconRobot className="size-9" stroke={1.5} />
        </div>
        <DialogHeader className="gap-3 sm:text-center">
          <div
            className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]"
            aria-hidden="true"
          >
            Welcome to AI Nexus
          </div>
          <DialogDescription className="text-base leading-relaxed italic text-muted-foreground">
            Your computer, but it works for you.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4">
        {FEATURE_ITEMS.map((item) => (
          <Card
            key={item.title}
            size="sm"
            className="min-h-[128px] justify-center gap-0 border-0 py-5 shadow-none ring-1 ring-foreground/10 transition-colors sm:min-h-[136px]"
          >
            <CardHeader className="flex flex-1 flex-col items-center justify-center space-y-2.5 px-4 pb-2 text-center">
              <item.icon
                className="size-8 shrink-0 text-muted-foreground"
                stroke={1.5}
                aria-hidden
              />
              <CardTitle className="text-sm font-medium leading-snug">{item.title}</CardTitle>
              <CardDescription className="text-xs leading-snug text-muted-foreground">
                {item.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-full px-8 text-base font-semibold shadow-sm"
        onClick={onContinue}
      >
        Get started
      </Button>
    </div>
  );
}
