---
# pawrrtal-1fu7
title: View/Container splits + sweep rules
status: completed
type: task
priority: normal
created_at: 2026-03-27T17:21:37Z
updated_at: 2026-03-27T17:29:25Z
---

1. Apply View/Container pattern to NavChats, ConversationSidebarItem, LoginForm\n2. Create .claude/rules for all sweep patterns


## Summary of Changes

### View/Container splits (3 components)
- **NavChats** → `NavChats.tsx` (container: data fetching, search state, group computation, localStorage persistence) + `NavChatsView.tsx` (view: search header, empty states, grouped conversation list)
- **LoginForm** → `LoginForm.tsx` (container: form state, API calls, navigation) + `LoginFormView.tsx` (view: card layout, form fields, error display)
- **ConversationSidebarItem** → `ConversationSidebarItem.tsx` (container: route resolution, age formatting) + `ConversationSidebarItemView.tsx` (view: EntityRow with menu content)

### New rules (7 files)
**React** (.claude/rules/react/):
1. hidden-overlay-pointer-events.md
2. keyboard-accessible-triggers.md
3. guard-storage-writes.md
4. extract-pure-functions.md
5. gate-persisted-state.md

**TypeScript** (.claude/rules/typescript/):
6. tsdocstrings-on-exports.md
7. explicit-return-types.md
