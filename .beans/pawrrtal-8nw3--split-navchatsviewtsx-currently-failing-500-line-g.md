---
# pawrrtal-8nw3
title: Split NavChatsView.tsx (currently failing 500-line gate)
status: todo
type: bug
priority: high
tags:
    - sentrux
    - modularity
    - refactor
    - line-budget
created_at: 2026-05-06T16:57:10Z
updated_at: 2026-05-06T16:57:10Z
parent: pawrrtal-ey9p
---

## Problem

`frontend/features/nav-chats/components/NavChatsView.tsx` is **509 lines** (per `node scripts/check-file-lines.mjs`) — over the 500-line hard ceiling enforced by `scripts/check-file-lines.mjs` and documented in `AGENTS.md`. The file currently fails `bun run check`.

Filed as `bug` because this violates a stated invariant ("CI fails on overflow" per AGENTS.md), even though no CI workflow currently runs the gate — see separate bean for the CI wiring gap.

## Evidence

```
$ node scripts/check-file-lines.mjs
file-lines: 1 file(s) exceed 500 lines:

    509  frontend/features/nav-chats/components/NavChatsView.tsx
```

It crossed the budget in commit `d585c02` on 2026-05-06 (`feat(ui): implement round 2 of inspector-driven UI fixes and enhancements`).

## Why it matters beyond the gate

`NavChatsView.tsx` is also the central node of modularity Hotspot 4 (it imports `ProjectsList` from a sibling feature; see `pawrrtal-3rqh`). Splitting will both restore the line budget and make the cross-feature edge easier to refactor.

## Plan

- [ ] Read `NavChatsView.tsx` and inventory its sections (sidebar header, conversation groups, drag handlers, project list slot, etc.)
- [ ] Extract logical pieces into colocated subcomponents under `frontend/features/nav-chats/components/`
- [ ] Re-run `node scripts/check-file-lines.mjs` and confirm pass
- [ ] `just check`, typecheck, tests
- [ ] Re-run sentrux; record any score delta

## Notes

- This work overlaps with `pawrrtal-3rqh` (sidebar composition decision). The split should preserve flexibility for that decision.
