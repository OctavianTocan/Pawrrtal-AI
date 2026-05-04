---
# ai-nexus-7n5r
title: Fix sidebar resize first drag
status: completed
type: bug
priority: normal
created_at: 2026-05-03T10:43:40Z
updated_at: 2026-05-03T10:57:43Z
---

Resize handle ignores the first drag and only works after releasing and trying again.

- [ ] Trace resizable panel pointer flow and current sidebar integration
- [x] Identify root cause of first drag being ignored
- [x] Patch the smallest affected layer
- [x] Verify typecheck/scoped checks


## Summary of Changes

Fixed the first-drag sidebar resize failure by separating the panel registration default size from the live persisted desktop width. The sidebar provider now exposes whether local-storage width hydration has completed, and the resizable layout captures that hydrated value once for `defaultSize`. Subsequent `onResize` updates still persist width, but no longer mutate the panel registration constraints while a drag is active. Verified with frontend typecheck, scoped Biome, and git diff whitespace check.
