---
# pawrrtal-vvc0
title: Fix ConversationSidebarItemView build parse error
status: completed
type: bug
priority: normal
created_at: 2026-05-03T13:29:58Z
updated_at: 2026-05-03T13:34:08Z
---

Next.js build fails because frontend/features/nav-chats/components/ConversationSidebarItemView.tsx has a destructured props block without its function declaration.

- [x] Restore valid component function syntax
- [x] Run a scoped verification gate
- [x] Mark this bean complete with a summary

## Summary of Changes

Restored the missing `ConversationSidebarItemView` component declaration and shared menu helpers, added the metadata action props already passed by the container, and verified the frontend build now succeeds.
