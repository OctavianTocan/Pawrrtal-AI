---
# ai-nexus-g5pd
title: 'Fix react-dropdown not opening: usePortal + placement priority'
status: completed
type: bug
priority: normal
created_at: 2026-05-07T07:43:58Z
updated_at: 2026-05-07T07:44:03Z
---

## Summary of Changes

- **`lib/react-dropdown/src/DropdownMenu.tsx`**: Removed `dropdownPlacement = 'bottom'` default so `placement` prop is no longer silently overridden by the stale default.
- **`lib/react-dropdown/src/DropdownMenuDef.tsx`**: Added `usePortal?: boolean` to `DropdownMenuDefProps` interface and threaded it through to the inner `DropdownMenu` call.
- **`frontend/features/chat/components/ChatComposerControls.tsx`**: Added `usePortal` to `AutoReviewSelector`'s `<DropdownMenu>`.
- **`frontend/components/nav-user.tsx`**: Added `usePortal` to `NavUser`'s `<DropdownMenuDef>`.
