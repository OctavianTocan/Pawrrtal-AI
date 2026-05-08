---
# pawrrtal-6fid
title: Fix onboarding cursor and selection affordances
status: completed
type: bug
priority: normal
created_at: 2026-05-02T22:35:34Z
updated_at: 2026-05-02T22:36:35Z
---

Show pointer cursors on interactive onboarding controls and prevent text selection on the folder picker button.

## Summary of Changes

Added explicit pointer cursors to interactive onboarding controls, preserved not-allowed cursors for disabled controls, and put select-none directly on the folder picker button so its inner copy cannot be selected. Verified with scoped Biome.
