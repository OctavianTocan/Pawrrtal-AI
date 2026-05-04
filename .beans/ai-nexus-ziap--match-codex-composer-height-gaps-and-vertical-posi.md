---
# ai-nexus-ziap
title: Match Codex composer height, gaps, and vertical position
status: completed
type: feature
priority: normal
created_at: 2026-05-03T21:09:04Z
updated_at: 2026-05-03T21:10:19Z
---

Tighten AI Nexus empty-state composer to match Codex compact look.



## Summary of Changes

Tightened the empty-state composer to match Codex's compact look while preserving the Plan button and the new Connect strip footer band.

**`frontend/features/chat/ChatView.tsx`**
- Heading-to-composer spacing: `mb-8` → `mb-6`.

**`frontend/features/chat/components/ChatComposer.tsx`**
- Textarea min height: `min-h-[4.5rem]` (72px) → `min-h-14` (56px).
- Footer addon: `min-h-10 px-2 pb-2` → `min-h-9 px-1.5 pb-1.5`.
- Plan button: `gap-1.5 px-2` → `gap-1 px-1.5`.
- Auto-review chip: `gap-1.5 px-2` → `gap-1 px-1.5`.
- Mic button: `size-8` (icon `size-4`) → `size-7` (icon `size-3.5`).
- Submit button: `size-8` (icons `size-4`/`size-3`) → `size-7` (icons `size-3.5`/`size-2.5`).

**`frontend/features/chat/components/ConnectAppsStrip.tsx`**
- Chip row: `gap-0.5` → `gap-1` to match the toolbar's gap rhythm.

Heading is anchored at `pt-[24vh]` and naturally pulls slightly higher because the composer block is shorter, matching Codex's upper-middle vertical position.
