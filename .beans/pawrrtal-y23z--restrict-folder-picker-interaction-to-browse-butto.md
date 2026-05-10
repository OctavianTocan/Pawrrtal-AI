---
# pawrrtal-y23z
title: Restrict folder picker interaction to browse button
status: completed
type: bug
priority: normal
created_at: 2026-05-02T22:38:38Z
updated_at: 2026-05-02T22:40:14Z
---

Make the folder display surface non-clickable/non-hoverable/non-selectable and keep only the Browse button interactive.

## Summary of Changes

Changed the folder display surface from a button to a passive select-none div with no hover or click handler. Moved the folder picker action exclusively to the Browse button and kept that button visible at all viewport sizes. Verified with scoped Biome.
