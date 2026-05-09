---
# pawrrtal-mxny
title: TSDoc coverage auditor script
status: completed
type: task
priority: normal
created_at: 2026-05-06T17:12:47Z
updated_at: 2026-05-06T17:16:08Z
---

Build scripts/check-docs.ts — a Bun/TypeScript script using the TypeScript compiler API to audit exported declarations for missing TSDoc/JSDoc across the frontend source tree. Report per-file, per-declaration, and aggregate coverage %.

## Summary of Changes

- Created `scripts/check-docs.ts` — Bun TypeScript script using the TypeScript compiler API (no extra deps, `typescript` already in workspace)
- Audits `frontend/` for exported functions, hooks, classes, interfaces, types, enums, and non-trivial constants missing TSDoc/JSDoc
- Per-file output with ✓/✗ per declaration, kind label, and line number
- Aggregate summary: files scanned, exports audited, coverage %, top offenders bar chart
- CLI flags: path-prefix scoping, `--fail-under=<n>`, `--show-covered`
- Added `just check-docs [args]` recipe to justfile
- Added `lint:docs` npm script to root `package.json`
- Verified: `frontend/hooks` shows 100%, `frontend/features/nav-chats` shows 98.2%, `--fail-under` exits 1 correctly, scoping works
