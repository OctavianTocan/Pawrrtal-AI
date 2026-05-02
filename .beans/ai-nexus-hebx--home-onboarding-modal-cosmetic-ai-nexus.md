---
# ai-nexus-hebx
title: Home onboarding modal (cosmetic AI Nexus)
status: completed
type: feature
priority: normal
created_at: 2026-05-02T19:38:18Z
updated_at: 2026-05-02T19:40:36Z
---

Three-step Dialog on / for Welcome → Create workspace → Local workspace. Cosmetic only.



## Summary of Changes

- Added `frontend/features/onboarding/` with three-step Dialog (Welcome → Create workspace → Local workspace), AI Nexus copy, theme tokens.
- Wired `OnboardingModal` into `frontend/app/(app)/page.tsx`. Cosmetic folder picker only; disabled options use `<fieldset disabled>`.
- Verified: `bun run typecheck` (frontend), Biome check on touched onboarding paths + page.
