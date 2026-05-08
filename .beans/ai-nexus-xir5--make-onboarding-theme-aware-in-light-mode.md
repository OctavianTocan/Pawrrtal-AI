---
# pawrrtal-xir5
title: Make onboarding theme-aware in light mode
status: completed
type: bug
priority: normal
created_at: 2026-05-03T09:52:02Z
updated_at: 2026-05-03T10:04:13Z
---

Swap onboarding modal surfaces and controls to app theme tokens in light mode while preserving dark mode styling.\n\n- [x] Audit onboarding hard-coded dark colors\n- [x] Replace light-mode styles with token-based classes\n- [x] Verify touched frontend files

## Summary of Changes\n\n- Replaced onboarding hard-coded dark surfaces and text with background, foreground, muted-foreground, border, ring, and shadow tokens.\n- Updated the onboarding backdrop canvas to read active theme variables, so the dithered scene follows light/dark mode.\n- Verified with scoped Biome, TypeScript, production build, and diff whitespace checks.
