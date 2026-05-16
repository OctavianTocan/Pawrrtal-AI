---
# pawrrtal-ska2
title: Investigate Telegram paragraph spacing
status: completed
type: bug
priority: normal
created_at: 2026-05-16T23:19:52Z
updated_at: 2026-05-16T23:24:38Z
---

Figure out why Telegram rendering adds one extra blank line after paragraphs except the last, then fix it if the cause is local and scoped.

## Summary of Changes

- Confirmed markdown-it renders adjacent paragraphs as separate HTML block tags with structural newline text nodes between them.
- Fixed Telegram HTML conversion to drop parser-only whitespace between block/container tags while preserving whitespace inside text-bearing tags and code/pre blocks.
- Added regression coverage for paragraph separators and list separators.
