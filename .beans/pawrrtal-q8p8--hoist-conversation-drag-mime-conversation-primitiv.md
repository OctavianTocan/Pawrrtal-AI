---
# pawrrtal-q8p8
title: Hoist CONVERSATION_DRAG_MIME + conversation primitives to lib/conversations/
status: todo
type: task
priority: normal
tags:
    - sentrux
    - modularity
    - refactor
created_at: 2026-05-06T16:51:24Z
updated_at: 2026-05-06T16:52:16Z
parent: pawrrtal-ey9p
---

## Why

Conversation-domain primitives (`chat-activity-context`, `use-conversation-mutations`, `CONVERSATION_DRAG_MIME`) currently live inside `frontend/features/nav-chats/`, but they are consumed by `chat`, `settings`, and `projects`. This makes `nav-chats` a horizontal hub at the same layer as its consumers, hurting modularity (sentrux health 2026-05-06: modularity score 5468, the new bottleneck).

## Cross-feature importers

- `frontend/features/chat/ChatContainer.tsx` → `@/features/nav-chats/context/chat-activity-context`
- `frontend/features/settings/sections/ArchivedChatsSection.tsx` → `@/features/nav-chats/hooks/use-conversation-mutations`
- `frontend/features/nav-chats/components/ConversationSidebarItemView.tsx` → `@/features/projects/constants` (`CONVERSATION_DRAG_MIME`)

## Plan

Stage A — quick win (one-liner)
- [ ] Move `CONVERSATION_DRAG_MIME` from `features/projects/constants.ts` → `frontend/lib/conversations/drag.ts`
- [ ] Update both importers (`projects` itself and `nav-chats/.../ConversationSidebarItemView.tsx`)

Stage B — domain extraction
- [ ] Create `frontend/features/conversations/` (or `frontend/lib/conversations/` if pure data) and move:
  - `chat-activity-context` (currently `features/nav-chats/context/`)
  - `use-conversation-mutations` (currently `features/nav-chats/hooks/`)
  - any colocated types
- [ ] Update `chat/ChatContainer.tsx`, `settings/sections/ArchivedChatsSection.tsx`, and any nav-chats consumers
- [ ] `nav-chats` becomes a pure visual feature consuming `conversations` primitives
- [ ] Re-run `just sentrux`; record delta
- [ ] `just check`, typecheck, tests

## Expected impact

Removes ~3 cross-feature edges and breaks the implicit `nav-chats` hub pattern. Probably the second highest single contributor after the personalization move.

## Notes

- Stage A is independently shippable.
- Stage B may interact with the existing `pawrrtal-23yy` (Projects sidebar reorg) and any pending nav-chats work; coordinate before starting.

## Coordination

Stage A (the  hoist) is independent of `pawrrtal-3rqh` (sidebar composition decision) and can ship anytime.

Stage B (extracting `chat-activity-context` and `use-conversation-mutations` into a `conversations` feature) should land *after* `pawrrtal-3rqh` resolves, since the chosen sidebar shape determines whether `conversations` becomes a peer feature or a sublibrary.
