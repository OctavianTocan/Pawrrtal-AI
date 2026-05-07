---
# ai-nexus-kds0
title: Build a primitive component system + merge the two onboardings
status: todo
type: epic
priority: high
created_at: 2026-05-07T16:20:18Z
updated_at: 2026-05-07T16:20:18Z
---

## Two related problems

### 1. The two onboardings

Two parallel onboarding flows exist:

- ``frontend/features/onboarding/v2/`` — the personalization wizard (steps include "Connect Messaging", workspace creation, etc).
- ``frontend/features/onboarding/`` (root) — the older create-workspace flow with the "Connect to remote server" button referenced in the Vercel-backend bean.

The TODO comment in ``onboarding-shell.tsx:2`` says "These files should not be a 'v2' onboarding; They're actually a completely different set of things." — that's the smoking gun. We need to merge them so a single coherent flow walks the user through ``account → workspace (local or remote) → personalization → connect channels → finish``.

### 2. The component system

The onboarding flows have hand-rolled buttons, panels, fields, forms. None of this is consolidated into a primitive component layer that other features can reuse — every new screen reinvents the same shapes. The user explicitly wants: a full component system covering buttons, panels, fields, forms, and similar primitives.

## Why these are one epic

You can't merge the onboardings cleanly without first deciding how the shared primitives look — otherwise each flow keeps its own ``Button``, ``Panel``, ``Field`` variants and the merge becomes a copy-paste exercise. The component system has to land first, then the merge consumes it.

## Plan (subject to refinement once started)

1. **Audit** every ad-hoc primitive currently used in either onboarding (every ``<button>``, every ``rounded-control bg-foreground …`` Tailwind soup, every Field shape).
2. **Catalogue** what we already have under ``frontend/components/ui/`` (shadcn primitives) and what's missing.
3. **Design tokens** — confirm the surface tokens these primitives should consume (``DESIGN.md`` source of truth). Don't introduce literal Tailwind colors per the project rule.
4. **Build the primitives** in ``frontend/components/ui/`` (or a new ``frontend/components/primitives/`` subdir) with Storybook coverage (or the project's equivalent — currently we don't have one, so set one up, scope: a few key primitives).
5. **Document** the component system in ``DESIGN.md`` — sizing, spacing, variant matrix.
6. **Migrate** the two onboardings onto the new primitives.
7. **Merge** the flows: pick the v2 layout as the canonical shell, port the workspace-create step in, sequence everything in one ``OnboardingShell``.
8. **Tests** — Playwright + RTL for the merged flow; visual snapshot for each primitive.

## Acceptance

- A single onboarding flow runs from sign-up to "Continue to app", covering account, workspace, personalization, channels.
- The flow is built entirely on documented primitives.
- DESIGN.md has a Components section listing each primitive with its props/variants matrix.
- Pixel-diff against the new merged flow stays stable in CI.
- Onboarding files no longer have a ``v2/`` namespace.

## Todos (will spawn child beans)

- [ ] Audit existing ad-hoc primitives in both onboardings (separate research bean)
- [ ] Decide primitives directory + naming convention
- [ ] Build core primitives: Button (already exists, audit variants), Field (text/textarea/select), Panel, Form, OnboardingShell (already exists)
- [ ] DESIGN.md component documentation
- [ ] Migrate v2 onboarding steps to primitives
- [ ] Merge the two onboarding directories
- [ ] Playwright + RTL coverage
- [ ] Open PRs as small reviewable slices, not one mega-PR

## Related

- ai-nexus-f58v (skeleton/loader pattern in DESIGN.md) shares the DESIGN.md surface — coordinate the section structure.
- ai-nexus-yfa2 (remote backend) needs the workspace-create step which lives in the older onboarding — this epic is what unblocks rewiring it cleanly.
