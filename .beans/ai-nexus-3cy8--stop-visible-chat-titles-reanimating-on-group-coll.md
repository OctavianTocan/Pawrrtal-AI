---
# pawrrtal-3cy8
title: Stop visible chat titles reanimating on group collapse
status: completed
type: bug
priority: normal
created_at: 2026-05-03T11:00:29Z
updated_at: 2026-05-03T11:08:06Z
---

Collapsing a conversation date/category group causes still-visible conversation titles in other groups to animate in again.

- [ ] Trace grouping render keys and title animation component
- [x] Identify why visible rows/title text remount or reanimate
- [x] Patch title rendering so collapse does not replay animations on existing rows
- [x] Verify scoped checks


## Summary of Changes

Removed the Calligraph renderer from static conversation sidebar titles. Calligraph uses Motion layout animation on each character, so collapsing a date/category group shifts visible rows and causes still-visible title characters to animate again. Sidebar titles now render as stable plain text outside search mode; search highlighting remains unchanged. Verified with frontend typecheck, scoped Biome, and git diff whitespace check.
