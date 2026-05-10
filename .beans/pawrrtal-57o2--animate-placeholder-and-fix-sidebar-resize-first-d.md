---
# pawrrtal-57o2
title: Animate placeholder and fix sidebar resize first drag
status: completed
type: bug
priority: normal
created_at: 2026-05-03T00:16:56Z
updated_at: 2026-05-03T00:24:52Z
---

Animate composer placeholder changes and fix the sidebar resize handle requiring a second drag before resizing.

## Summary of Changes

Added an animated passive placeholder layer over the chat composer textarea so placeholder text fades/slides in when it rotates, while keeping reduced-motion support in global CSS. Fixed the sidebar resize first-drag issue by removing the always-on flex-grow transition during manual drags and enabling that transition only during programmatic collapse/expand. Also hardened the rotating placeholder fallback type. Verified with scoped Biome, full typecheck, git diff whitespace check, and production build.
