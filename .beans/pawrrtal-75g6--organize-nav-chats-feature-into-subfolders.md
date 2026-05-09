---
# pawrrtal-75g6
title: Organize nav-chats feature into subfolders
status: completed
type: task
priority: normal
created_at: 2026-05-02T09:45:12Z
updated_at: 2026-05-02T09:45:36Z
---

Group components, dialogs, hooks, context, and lib under frontend/features/nav-chats.

## Summary of Changes

Reorganized `frontend/features/nav-chats/` into subfolders:
- `components/` — NavChatsView, sidebar list UI pieces
- `dialogs/` — rename/delete dialogs
- `hooks/` — orchestration, mutations, actions, conversation search
- `context/` — chat activity + sidebar focus
- `lib/` — conversation-selection helpers

Public entry `NavChats.tsx` remains at feature root. External imports updated for context modules (`ChatContainer`, `app-layout`). Verified `bun run typecheck`.
