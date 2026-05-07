---
# ai-nexus-eirj
title: Stronger disabled styling for DropdownMenuItem
status: completed
type: task
priority: normal
created_at: 2026-05-07T20:45:49Z
updated_at: 2026-05-07T20:46:10Z
---

Fix data-disabled visuals in react-dropdown (muted text, no hover wash).



## Summary of Changes

Updated `DEFAULT_ITEM_CLASSNAME` in `frontend/lib/react-dropdown/src/DropdownPanelItems.tsx`: disabled items now use muted label color, ~42% opacity, softer default icon tint, and transparent hover/focus backgrounds so they no longer pick up the interactive hover wash.
