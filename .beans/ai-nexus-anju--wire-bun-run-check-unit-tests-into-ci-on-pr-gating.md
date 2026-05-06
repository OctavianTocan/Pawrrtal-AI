---
# ai-nexus-anju
title: Wire bun run check + unit tests into CI on PR (gating gap)
status: todo
type: bug
priority: high
tags:
    - ci
    - gating
    - tech-debt
created_at: 2026-05-06T16:57:49Z
updated_at: 2026-05-06T16:57:49Z
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
- File-line budget overflow will not fail CI (proven: `NavChatsView.tsx` at 509 lines was merged today, see `ai-nexus-8nw3`)
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
- Tests may be flaky on first wiring; expect to fix a backlog of skipped/broken tests. Coordinate with `ai-nexus-25yy` (test coverage to 70%) and `ai-nexus-cigl`.
