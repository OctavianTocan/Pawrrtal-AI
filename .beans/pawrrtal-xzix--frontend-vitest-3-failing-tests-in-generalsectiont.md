---
# pawrrtal-xzix
title: 'Frontend Vitest: 3 failing tests in GeneralSection.test.tsx (stale UI strings)'
status: todo
type: bug
priority: high
tags:
    - tests
    - frontend
    - stale-test
created_at: 2026-05-06T17:09:37Z
updated_at: 2026-05-06T17:09:37Z
---

## Problem

`bun run test` in `frontend/` reports 3 failures (309/312 pass):

```
Test Files  2 failed | 72 passed (74)
     Tests  3 failed | 309 passed (312)
```

The failures are in `frontend/features/settings/sections/GeneralSection.test.tsx`. The test asserts:

```ts
expect(getByText("System")).toBeTruthy();
expect(getByText("Light")).toBeTruthy();
expect(getByText("Dark")).toBeTruthy();
```

The current rendered DOM (per the test output) contains rows like "What should we call you?" and a name input, not the appearance segmented control text — the component appears to have been rewritten and the tests were not updated.

## Why it surfaced now

Discovered while wiring `tests.yml` into CI (`pawrrtal-anju`). The new workflow runs `bun run test` and correctly catches this. Locally, nobody had run the suite recently.

## Plan

- [ ] Read `frontend/features/settings/sections/GeneralSection.tsx` and understand the current rendered output
- [ ] Either update `GeneralSection.test.tsx` to assert against the current DOM, or rewrite the test to cover the actual current behavior (the appearance toggle may now live in `AppearanceSection.tsx`)
- [ ] Identify the second failing test file referenced in the summary (only `GeneralSection.test.tsx` was visible in the truncated tail; check the full output)
- [ ] Confirm `bun run test` exits 0
- [ ] `just check`, then commit

## Notes

- This bean blocks the frontend job in `tests.yml` from going green.
- Coordinate with `pawrrtal-cigl` (push frontend test coverage from 36% to 70%) — fixing stale tests is prerequisite to credibly measuring coverage.
