---
# pawrrtal-9vft
title: Delete dead duplicate UseConversationMutations.ts
status: todo
type: task
priority: low
tags:
    - refactor
    - dead-code
created_at: 2026-05-06T16:57:30Z
updated_at: 2026-05-06T16:57:30Z
---

## Why

`frontend/features/nav-chats/UseConversationMutations.ts` (143 lines) is self-documented dead code:

```
@fileoverview Duplicate of the rename/delete hooks in `hooks/use-conversation-mutations.ts`.
The app imports from the hooks path; this file is currently unused.
```

The active version is `frontend/features/nav-chats/hooks/use-conversation-mutations.ts` (230 lines).

Per the project no-backwards-compat rule (`.cursor/rules/no-backwards-compat.mdc`), shim/duplicate files should be deleted, not left as dormant.

## Plan

- [ ] Confirm zero importers of `frontend/features/nav-chats/UseConversationMutations.ts`
- [ ] Delete the file
- [ ] Also note: file uses PascalCase, which violates the kebab-case-for-hooks naming convention; deletion makes this moot
- [ ] `just check`, typecheck, tests

## Expected impact

Removes 143 lines of dead code and one improperly-named feature-level file. Tiny but free.
