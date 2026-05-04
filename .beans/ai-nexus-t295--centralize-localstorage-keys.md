---
# ai-nexus-t295
title: Centralize localStorage keys in a constants file
status: completed
type: task
priority: normal
created_at: 2026-03-28T00:51:00Z
updated_at: 2026-05-04T10:02:18Z
---

Create a centralized constants file for all localStorage keys used across the frontend.

## Requirements

- Create `frontend/lib/storage-keys.ts` (or similar)
- Export constants for all localStorage keys (e.g., `COLLAPSED_GROUPS_KEY`)
- Update all files that use localStorage to import from this file
- Document each key's purpose

## Current localStorage keys

- `nav-chats-collapsed-groups` (NavChats.tsx:14)
- (Add others as discovered)

## Benefits

- Prevents typos/inconsistencies
- Makes it easy to find all storage usage
- Simplifies refactoring (e.g., adding prefixes, versioning)
- Provides a single source of truth for storage schema



## Summary of Changes

- Created frontend/lib/storage-keys.ts with SIDEBAR_STORAGE_KEYS object (state, width). Cross-cutting keys owned by app-wide UI primitives (components/ui/*) live here.
- Created frontend/features/nav-chats/constants.ts with NAV_CHATS_STORAGE_KEYS (collapsedGroups). Feature-scoped keys live next to the feature, mirroring features/chat/constants.ts.
- Wired frontend/components/ui/sidebar.tsx to use SIDEBAR_STORAGE_KEYS.{state,width}.
- Wired frontend/features/nav-chats/NavChats.tsx to use NAV_CHATS_STORAGE_KEYS.collapsedGroups.
- Existing key strings preserved verbatim (sidebar_state, sidebar_width, nav-chats-collapsed-groups) so no users persisted preferences are orphaned.

Convention codified across the repo: cross-cutting keys → lib/storage-keys.ts; feature-scoped keys → features/<feature>/constants.ts. Earlier work in this area: features/chat/constants.ts (commit af8166f).

tsc + biome + vitest (38/38) all pass.
