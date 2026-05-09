---
# pawrrtal-drne
title: Rename nav-chats hooks to use-kebab-case filenames
status: completed
type: task
priority: normal
created_at: 2026-05-02T09:46:22Z
updated_at: 2026-05-02T09:46:38Z
---

UseConversationActions.ts and UseConversationMutations.ts → use-conversation-actions.ts and use-conversation-mutations.ts

## Summary of Changes

- Renamed `UseConversationMutations.ts` → `use-conversation-mutations.ts`
- Renamed `UseConversationActions.ts` → `use-conversation-actions.ts`
- Updated imports in `use-conversation-actions.ts` and `NavChats.tsx`
- `bun run typecheck` passes
