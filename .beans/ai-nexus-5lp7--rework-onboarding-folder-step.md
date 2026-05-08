---
# pawrrtal-5lp7
title: Rework onboarding folder step
status: completed
type: bug
priority: normal
created_at: 2026-05-02T21:55:19Z
updated_at: 2026-05-02T22:00:14Z
---

The existing folder onboarding step looks weak and empty. Redesign it into a cleaner, app-native folder selection panel with stronger hierarchy and better controls.

## Summary of Changes

Reworked the existing-folder onboarding step into a tighter app-native command panel: left-aligned copy, a single large folder target with selected-state styling, smaller rounded controls aligned with sidebar/menu radius, and a less heavy disabled primary action. Verified with `bun run typecheck` and scoped Biome.
