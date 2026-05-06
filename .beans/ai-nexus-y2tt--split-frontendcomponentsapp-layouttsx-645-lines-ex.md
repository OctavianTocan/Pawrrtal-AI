---
# ai-nexus-y2tt
title: Split frontend/components/app-layout.tsx (645 lines, exempted via TODO)
status: todo
type: task
priority: normal
tags:
    - refactor
    - line-budget
    - tech-debt
created_at: 2026-05-06T16:57:23Z
updated_at: 2026-05-06T16:57:23Z
parent: ai-nexus-ey9p
---

## Why

`frontend/components/app-layout.tsx` is **645 lines**, exceeding the 500-line ceiling. It is currently exempted via `EXEMPT_PATH_FRAGMENTS` in `scripts/check-file-lines.mjs:71-75` with an inline TODO referencing `ai-nexus-1vti follow-up` — but no follow-up bean was actually opened.

This bean *is* that follow-up.

## Source

```js
// scripts/check-file-lines.mjs:71-75
const EXEMPT_PATH_FRAGMENTS = [
  "frontend/components/ui/",
  // TODO(ai-nexus-1vti follow-up): split these and remove the exemption.
  "frontend/components/app-layout.tsx",
];
```

## Plan

- [ ] Read `app-layout.tsx`; identify split lines (top bar, sidebar slot, content shell, mobile breakpoints, theming hooks)
- [ ] Extract subcomponents (e.g. `AppLayoutTopBar`, `AppLayoutContentShell`, etc.) into `frontend/components/app-layout/` directory or as siblings
- [ ] Update the single importer (`frontend/app/(app)/layout.tsx`)
- [ ] Remove `frontend/components/app-layout.tsx` from `EXEMPT_PATH_FRAGMENTS` in the script
- [ ] `node scripts/check-file-lines.mjs` passes without the exemption
- [ ] `just check`, typecheck, tests, design-lint

## Risk

- Single importer (only `app/(app)/layout.tsx`) — low blast radius.
- App layout is core to every authed page; smoke-test the main routes after split.
- 15 commits in last 90 days — moderate churn; coordinate with active work.
