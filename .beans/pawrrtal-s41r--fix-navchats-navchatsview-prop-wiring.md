---
# pawrrtal-s41r
title: fix NavChats NavChatsView prop wiring
status: completed
type: task
priority: normal
created_at: 2026-04-24T23:21:42Z
updated_at: 2026-04-24T23:23:28Z
---

Wire navigator ref, content search, multi-select, and keyboard handlers so NavChats matches NavChatsViewProps and typecheck passes.



## Summary of Changes
- Added `use-nav-chats-orchestration.ts` to wire `useConversationSearch`, multi-select (`conversation-selection`), list refs, route-synced selection, click/modifier behavior, and keyboard nav for `NavChatsView`.
- `NavChats.tsx` now spreads those props into `NavChatsView`.
- `sidebar-focus.tsx`: `useOptionalSidebarFocusContext` for Tab zone cycling when a provider is mounted; no-ops when absent.
