---
# pawrrtal-4zs1
title: Fix full-page onboarding visual polish
status: completed
type: bug
priority: normal
created_at: 2026-05-02T21:21:10Z
updated_at: 2026-05-02T21:31:08Z
---

Address the current onboarding redesign problems: replace the obvious rotating block background with a full-viewport dithered vortex, remove unnecessary outer color, align controls/surfaces with app styling, and remove the robot icon.

## Summary of Changes

- Replaced the CSS rotating-block backdrop with an isolated canvas renderer that draws a full-viewport dithered spiral field.
- Removed the colored outer edge treatment and the inset rounded background container.
- Removed the welcome-step mascot icon and tightened panel, option, button, and text styling toward the app popover surface language.
- Verified with frontend typecheck, scoped Biome, and production build.

## Verification

- `bun run typecheck`
- `bunx --bun @biomejs/biome check --write frontend/features/onboarding frontend/app/globals.css` (passes with existing unrelated globals.css important-style warnings)
- `bun run build`
