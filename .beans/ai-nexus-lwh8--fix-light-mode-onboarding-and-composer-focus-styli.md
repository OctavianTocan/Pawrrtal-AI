---
# ai-nexus-lwh8
title: Fix light mode onboarding and composer focus styling
status: completed
type: bug
priority: normal
created_at: 2026-05-03T00:27:24Z
updated_at: 2026-05-03T00:34:38Z
---

Ensure onboarding surfaces remain legible in light mode and keep the chat composer shadow stable when focused.\n\n- [x] Audit onboarding and composer focus styling\n- [x] Update light/dark theme-aware classes or tokens\n- [x] Verify typecheck/lint/build gates

## Summary of Changes\n\n- Kept onboarding panels on a dark, legible scene-specific surface even when the app is in light mode.\n- Added a dedicated composer input-group focus style so the resting shadow is preserved when the textarea is focused.\n- Verified with scoped Biome, TypeScript, diff whitespace checks, and production build.
