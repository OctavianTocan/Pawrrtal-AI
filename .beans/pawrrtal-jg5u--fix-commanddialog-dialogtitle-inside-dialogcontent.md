---
# pawrrtal-jg5u
title: 'Fix CommandDialog: DialogTitle inside DialogContent'
status: completed
type: bug
priority: normal
created_at: 2026-05-02T19:59:17Z
updated_at: 2026-05-02T19:59:27Z
---

Radix warns when DialogTitle is outside DialogContent. CommandDialog had Header as sibling; move sr-only title/description inside Content.

\n\n## Summary of Changes\n\n- Moved sr-only `DialogHeader` (`DialogTitle` + `DialogDescription`) inside `DialogContent` in `frontend/components/ui/command.tsx` `CommandDialog`, because Radix only associates a title with the dialog when `DialogTitle` is a descendant of `DialogContent`. Previously the header was a sibling, triggering the console warning.
