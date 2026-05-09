---
# pawrrtal-6b25
title: Tighten sidebar text sizes and shrink composer footer/connect strip
status: completed
type: task
priority: normal
created_at: 2026-05-06T11:45:00Z
updated_at: 2026-05-06T12:02:26Z
---

Address 6 UI feedback items from user inspector report:

1. PromptInputFooter (frontend/components/ai-elements/prompt-input-layout.tsx:64) - shorter vertically
2. ConnectAppsStrip (frontend/features/chat/components/ConnectAppsStrip.tsx) - shorter, smaller text, icons closer
3. ProjectRow project name (frontend/features/projects/components/ProjectRow.tsx:127) - 14px
4. ProjectsList Projects header (frontend/features/projects/components/ProjectsList.tsx:113) - 12px
5. ConversationSidebarItemView title - 14px (already done)
6. CollapsibleGroupHeader 'Today' label (frontend/features/nav-chats/components/CollapsibleGroupHeader.tsx:44) - 12px

Also: projects + chats should scroll together as one group.

## TODO
- [x] Reduce PromptInputFooter vertical padding
- [x] Tighten ConnectAppsStrip (smaller text, tighter icons, less height)
- [x] Set ProjectRow name to text-[14px]
- [x] Set Projects header to text-xs (12px)
- [x] Set CollapsibleGroupHeader label to text-xs (12px)
- [x] Move ProjectsList inside the same scroll container as conversations
- [x] Run formatter + tsc on changed files
- [x] Commit one logical chunk

## Summary of Changes

6 inspector-tagged tweaks plus a structural fix.

- `frontend/components/ai-elements/prompt-input-layout.tsx` — `PromptInputFooter` now has `py-1.5 pb-1.5` so the composer footer (Auto-review / model / reasoning row) reads less tall against the textarea.
- `frontend/features/chat/components/ConnectAppsStrip.tsx` — strip uses `py-1.5`, `text-xs`, `gap-0`, and `size-7` brand-icon hit targets so the lineup feels grouped and the band is no longer dominant.
- `frontend/features/projects/components/ProjectRow.tsx` — project name span pinned to `text-[14px]` so it matches conversation titles regardless of parent text-size drift.
- `frontend/features/projects/components/ProjectsList.tsx` — collapse-header ("Projects") moved to `text-xs` (12px).
- `frontend/features/nav-chats/components/CollapsibleGroupHeader.tsx` — date-group label moved to `text-xs` (12px).
- `frontend/features/nav-chats/components/NavChatsView.tsx` — projects + chats now share a single `min-h-0 flex-1 overflow-y-auto` wrapper so they scroll together. The listbox div keeps `role="listbox"` and `pt-1 outline-none` but no longer owns the scroll.
- `frontend/features/nav-chats/components/ConversationSidebarItemView.tsx` — already `text-[14px]`; left untouched.

Verified: `bunx biome format --write`, `bunx biome check`, `bunx tsc --noEmit` all clean.
