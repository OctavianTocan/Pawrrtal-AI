---
# ai-nexus-6tjp
title: 'Onboarding dialog: remove manual aria-labelledby/useId for Radix TitleWarning'
status: completed
type: bug
priority: normal
created_at: 2026-05-02T20:01:30Z
updated_at: 2026-05-02T20:01:38Z
---

Radix TitleWarning uses getElementById(titleId); custom useId + aria-labelledby can false-positive. Let DialogTitle wire labels via context.

\n\n## Summary of Changes\n\n- Removed `useId`/`aria-labelledby`/`id` from `OnboardingModal` so Radix’s internal title id and `aria-labelledby` stay consistent with `DialogTitle`, avoiding dev `TitleWarning` false positives from `document.getElementById`.
