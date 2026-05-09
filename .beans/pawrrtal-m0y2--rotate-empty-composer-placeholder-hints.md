---
# pawrrtal-m0y2
title: Rotate empty composer placeholder hints
status: completed
type: task
priority: normal
created_at: 2026-05-03T00:02:49Z
updated_at: 2026-05-03T00:14:43Z
---

## Goal

Rotate the empty chat composer placeholder through short app hints every few seconds.

## Checklist

- [x] Add placeholder hint list
- [x] Rotate only while the composer is empty
- [x] Verify scoped frontend checks

## Summary of Changes

Added a rotating empty-state placeholder list to the chat composer. The placeholder cycles every 3.2 seconds while the draft is empty, resets to the default hint once the user types, and uses short app-oriented hints for sidebar toggle, mentions, attachments, and Auto-review. Verified with frontend typecheck, scoped Biome, and diff whitespace checks.
