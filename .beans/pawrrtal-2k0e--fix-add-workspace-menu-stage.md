---
# pawrrtal-2k0e
title: Fix add workspace menu stage
status: completed
type: bug
priority: normal
created_at: 2026-05-02T21:48:51Z
updated_at: 2026-05-02T21:50:38Z
---

The Add Workspace onboarding step looks visually broken: disabled rows are dim/dead-looking and row surfaces do not read as a clean menu. Make the rows compact, visually consistent, and keep only Open folder functionally active.

## Summary of Changes

- Replaced the disabled `fieldset` rows with one consistent button-row shape for all workspace options.
- Kept only `Open folder` keyboard-focusable and clickable; upcoming rows are visually consistent but `aria-disabled` and removed from tab order.
- Reduced row height and gap so the menu reads as a compact option list instead of three heavy blocks.

## Verification

- `bun run typecheck`
- `bunx --bun @biomejs/biome check --write frontend/features/onboarding/onboarding-create-workspace-step.tsx`
