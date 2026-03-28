---
# ai-nexus-t295
title: Centralize localStorage keys in a constants file
status: todo
type: task
priority: normal
created_at: 2026-03-28T00:51:00Z
updated_at: 2026-03-28T00:51:00Z
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
