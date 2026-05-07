---
# ai-nexus-211o
title: Add animations to CollapsibleGroupHeader
status: completed
type: task
priority: normal
created_at: 2026-03-28T00:51:00Z
updated_at: 2026-05-07T16:34:05Z
---

Add smooth animations for the expand/collapse transition in `CollapsibleGroupHeader`.

## Requirements

- Animate the chevron rotation (currently instant via Tailwind `transition-transform`)
- Animate the height transition when groups expand/collapse
- Consider using Radix UI Collapsible primitive for smooth height animations
- Match Craft's animation timing/easing if possible

## Files to change

- `frontend/features/nav-chats/CollapsibleGroupHeader.tsx`
- `frontend/features/nav-chats/NavChatsView.tsx` (wrapping logic)

## Context

Currently, the chevron rotates with a CSS transition, but the content appears/disappears instantly. Adding height animations will make the interaction feel more polished.
