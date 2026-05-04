---
# ai-nexus-p9xy
title: 'Mark-unread bug: navigates user to home while preserving sidebar selection'
status: todo
type: bug
priority: high
created_at: 2026-05-04T21:37:56Z
updated_at: 2026-05-04T21:37:56Z
blocked_by:
    - ai-nexus-28en
---

Right-clicking a conversation while open and choosing 'Mark as Unread' navigates the user to the home page even though the sidebar still shows the conversation selected. Subsequent clicks on the same row no-op (URL unchanged). Needs runtime debugging — could be cache invalidation race, useGetConversation refetch failing, or chat-activity-context resetting state. Reproduce: open conversation → right-click → Mark as Unread → observe nav.
