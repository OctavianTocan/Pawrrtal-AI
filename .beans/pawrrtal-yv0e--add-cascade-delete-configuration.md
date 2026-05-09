---
# pawrrtal-yv0e
title: Add Cascade Delete Configuration
status: completed
type: task
priority: normal
tags:
    - Backend
    - Sprint 4
created_at: 2026-02-27T15:04:51Z
updated_at: 2026-03-07T22:26:00Z
---

Notion Task #35

## Summary of Changes

Cascade delete configured on all user FKs: Conversation, APIKey, UserPreferences. Bug in UserPreferences (ondelete passed to mapped_column instead of ForeignKey) was fixed.
