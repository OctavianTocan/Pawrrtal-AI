---
# ai-nexus-mlaj
title: Centralize inline localStorage keys in NavChats and sidebar
status: scrapped
type: task
priority: normal
created_at: 2026-05-04T10:00:23Z
updated_at: 2026-05-04T10:02:11Z
---

Move the remaining inline localStorage keys into a repo-wide registry to match the convention established by features/chat/constants.ts.

Inline keys to migrate:
- frontend/features/nav-chats/NavChats.tsx → COLLAPSED_GROUPS_STORAGE_KEY = 'nav-chats-collapsed-groups'
- frontend/components/ui/sidebar.tsx → SIDEBAR_STATE_STORAGE_KEY = 'sidebar_state', SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar_width'

## Approach
- Cross-feature/shared keys (sidebar lives in components/ui, used app-wide) → frontend/lib/storage-keys.ts
- nav-chats-collapsed-groups is feature-scoped → frontend/features/nav-chats/constants.ts (matches features/chat/constants.ts pattern)
- Both modules export a NAMESPACE_STORAGE_KEYS object as the single source of truth
- Keep existing key strings exact-match (do not rename — would orphan persisted user data)

## Todos
- [ ] Create frontend/lib/storage-keys.ts with SIDEBAR_STORAGE_KEYS
- [ ] Create frontend/features/nav-chats/constants.ts with NAV_CHATS_STORAGE_KEYS
- [ ] Wire components/ui/sidebar.tsx to import from lib/storage-keys
- [ ] Wire features/nav-chats/NavChats.tsx to import from features/nav-chats/constants
- [ ] Run typecheck + biome + tests
- [ ] Commit

## Reasons for Scrapping

Duplicate of ai-nexus-t295 ("Centralize localStorage keys in a constants file") which predates this bean and covers identical scope. Completed work tracked under that bean instead.
