---
# pawrrtal-im7l
title: Fix DropdownContextMenu onOpenChange during setState updater
status: completed
type: bug
priority: normal
created_at: 2026-05-12T17:15:41Z
updated_at: 2026-05-12T17:16:16Z
---

React 19: onOpenChange(true) inside setPosition updater updates EntityRow while DropdownContextMenu is updating. Move notification out of updater using position ref.



## Summary of Changes

- Removed `onOpenChange?.(true)` from inside the `setPosition` functional updater in `frontend/lib/react-dropdown/src/DropdownContextMenu.tsx`.
- Added `positionRef` mirroring `position` so `openAt` can detect closed→open without an updater side effect.
- `onOpenChange(true)` now runs from the event handler path after `setPosition`, satisfying React 19 rules.

Verified: `cd frontend && bun run check`.
