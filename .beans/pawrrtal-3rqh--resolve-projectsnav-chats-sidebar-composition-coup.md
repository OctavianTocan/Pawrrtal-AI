---
# pawrrtal-3rqh
title: Resolve projects↔nav-chats sidebar composition coupling
status: draft
type: task
priority: normal
tags:
    - sentrux
    - modularity
    - refactor
created_at: 2026-05-06T16:51:52Z
updated_at: 2026-05-06T16:52:16Z
parent: pawrrtal-ey9p
---

## Why

`features/nav-chats/components/NavChatsView.tsx` directly imports `ProjectsList` from `@/features/projects/components/ProjectsList`, and `ConversationSidebarItemView.tsx` imports `CONVERSATION_DRAG_MIME` from `@/features/projects/constants`. This couples two sibling features at the same layer.

Status `draft` because the right shape depends on whether the two features should remain peers or be merged under a parent sidebar feature. Decide before starting work.

## Cross-feature importers

- `frontend/features/nav-chats/components/NavChatsView.tsx` → `@/features/projects/components/ProjectsList`
- `frontend/features/nav-chats/components/ConversationSidebarItemView.tsx` → `@/features/projects/constants`

## Options to evaluate

1. **Slot-prop inversion** — `NavChatsView` accepts a `projectsSlot` (or children) and the page composes both. Removes the import without merging features.
2. **Sidebar parent feature** — fold `nav-chats` and `projects` under a new `features/sidebar/` parent that owns composition. Heavier refactor; clearer ownership.
3. **Shared sidebar lib** — extract drag/drop + selection state to `lib/sidebar/`. Keeps features peer but removes the constant-sharing edge.

The `CONVERSATION_DRAG_MIME` move is already covered by `pawrrtal-q8p8` Stage A.

## Plan

- [ ] Decide between options 1, 2, 3 above (small ADR or comment in this bean)
- [ ] Execute chosen option
- [ ] Re-run sentrux; verify nav-chats no longer imports from projects
- [ ] `just check`, typecheck, tests

## Notes

- Coordinate with `pawrrtal-23yy` (Projects backend + sidebar reorg) and `pawrrtal-q8p8` (conversations primitives) — these three together define the sidebar architecture.
