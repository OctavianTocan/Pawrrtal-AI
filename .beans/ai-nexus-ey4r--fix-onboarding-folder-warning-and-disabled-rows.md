---
# ai-nexus-ey4r
title: Fix onboarding folder warning and disabled rows
status: completed
type: bug
priority: normal
created_at: 2026-05-02T22:26:35Z
updated_at: 2026-05-02T22:28:27Z
---

Resolve the React webkitdirectory console warning and make unavailable onboarding workspace options visually disabled.

## Summary of Changes

Changed the hidden folder input to use string-valued webkitdirectory/directory attributes so React no longer warns about non-boolean DOM attributes. Updated unavailable workspace options to be real disabled buttons with stronger disabled visual treatment for row, icon, title, and description. Verified with scoped Biome; full typecheck is currently blocked by an unrelated ModelSelectorPopover type error.
