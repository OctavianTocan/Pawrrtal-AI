---
# pawrrtal-anju
title: Wire bun run check + unit tests into CI on PR (gating gap)
status: in-progress
type: bug
priority: high
tags:
    - ci
    - gating
    - tech-debt
created_at: 2026-05-06T16:57:49Z
updated_at: 2026-05-06T17:09:57Z
---

## Problem

`AGENTS.md` claims:

> **File-line budget**: 500 lines hard ceiling for any `.ts`/`.tsx`/`.py` source file. `node scripts/check-file-lines.mjs` enforces it; CI fails on overflow.

But after auditing `.github/workflows/`, no workflow currently runs `bun run check`, `node scripts/check-file-lines.mjs`, or any unit-test runner. CI runs only:

| Workflow | What it gates |
|---|---|
| `sentrux.yml` | `scripts/sentrux-check.sh` (sentrux structural rules) |
| `design-lint.yml` | `bun run design:lint` |
| `stagehand-e2e.yml` | E2E suite |
| `rebase.yml` | Auto-rebase, not a gate |

This means:
- Biome violations on PR will not fail CI
- TypeScript type errors on PR will not fail CI
- File-line budget overflow will not fail CI (proven: `NavChatsView.tsx` at 509 lines was merged today, see `pawrrtal-8nw3`)
- Frontend Vitest suite + backend pytest suite do not run on PRs
- Local `just check` and developer discipline are the only safety net

## Evidence

`NavChatsView.tsx` crossed 500 lines in commit `d585c02` (2026-05-06 14:02). The most recent CI runs on `development` show only `Sentrux Architecture Check` + `Auto-rebase PRs` as success. No Biome/tsc/file-lines/test workflow ran.

## Plan

- [ ] Add `.github/workflows/check.yml` that runs `bun install` + `cd frontend && bun run check` (Biome + tsc + file-lines) on every PR to `development`/`main`
- [ ] Add `.github/workflows/tests.yml` (or extend) running:
  - `cd frontend && bun run test --run`
  - `cd backend && uv run pytest`
- [ ] Confirm both workflows fail when an intentional violation is pushed (e.g. add `any` cast, oversize file, broken test) and pass once reverted
- [ ] Update `AGENTS.md` so the claim and the reality match (either the claim describes the new workflow, or the claim is dialed back)
- [ ] If desired, add path filters to skip workflow runs on docs-only PRs

## Risk / cost

- Adds ~2-5 minutes to PR CI time. Mitigated by Bun caching and only running where needed.
- Tests may be flaky on first wiring; expect to fix a backlog of skipped/broken tests. Coordinate with `pawrrtal-25yy` (test coverage to 70%) and `pawrrtal-cigl`.

## Progress 2026-05-06

Workflows shipped:

- `.github/workflows/check.yml` runs `bun run check` (Biome + tsc + file-lines) on every PR/push to development/main, on the `[self-hosted, pawrrtal]` runner. Posts a PR comment on failure.
- `.github/workflows/tests.yml` runs frontend Vitest and backend pytest as parallel jobs on the same runner. Posts a PR comment on failure.

Path filters scoped tightly so docs-only PRs don't trigger the runs.

## Discovered while shipping (separate beans)

- pawrrtal-gvsb (high, bug) — backend pytest collection error: `tests/test_providers_and_schemas.py` imports a renamed/removed symbol `GeminiLLM`.
- pawrrtal-xzix (high, bug) — frontend Vitest has 3 failing tests in `GeneralSection.test.tsx` against stale rendered strings.
- Existing pawrrtal-8nw3 (high, bug) — `NavChatsView.tsx` already over the 500-line budget; `check.yml` will catch it on first run.

## Expected first-run state on PR

- `Frontend Check` job: RED (line-budget violation in NavChatsView.tsx).
- `Tests / Frontend Vitest` job: RED (3 stale tests).
- `Tests / Backend pytest` job: RED (collection error).

This is correct behavior: the gates exist now and they are catching pre-existing problems. Each red is tracked in its own bean.

## Remaining sub-tasks

- [x] Add `check.yml` for Biome + tsc + file-lines
- [x] Add `tests.yml` for Vitest + pytest with parallel jobs
- [x] Use the `[self-hosted, pawrrtal]` runner labels
- [ ] Verify on the first PR that both workflows execute on the self-hosted runner (no labels mismatch)
- [ ] Once the three stale-test/violation beans land, confirm both workflows go green on a clean PR
