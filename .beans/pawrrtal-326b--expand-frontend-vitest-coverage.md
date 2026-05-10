---
# pawrrtal-326b
title: Expand frontend Vitest coverage
status: completed
type: task
priority: normal
created_at: 2026-05-03T14:07:40Z
updated_at: 2026-05-03T14:08:18Z
---

Add unit tests for lib helpers (route-utils, format-conversation-age, highlightMatch) following existing patterns.



## Summary of Changes

Added colocated Vitest tests: lib/route-utils.test.ts, lib/format-conversation-age.test.ts, lib/highlight-match.test.tsx, lib/utils.test.ts. Total frontend tests: 33 passing. Follows pyramid: fast pure-function and RTL checks only.
