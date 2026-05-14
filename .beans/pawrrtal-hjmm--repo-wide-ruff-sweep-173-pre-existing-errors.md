---
# pawrrtal-hjmm
title: 'Repo-wide ruff sweep: 173 pre-existing errors'
status: todo
type: task
priority: low
created_at: 2026-05-14T08:00:13Z
updated_at: 2026-05-14T08:00:13Z
---

Surfaced by Task 11 verification: 'just check' reports 176 ruff errors across the repo, 173 of which sit in files untouched by the model-id canonical-format migration (and the other 3 are in gemini_provider.py last edited in PR #154, also untouched). Dominant rule: PLC0415 (import-at-top-level, 77 occurrences). Per the no-pre-existing-excuse rule these belong in a sibling cleanup PR rather than the canonical-model PR. Plan: group by rule, fix mechanically where possible (auto-fixable: ~21 of 176), refactor where not, in 3-5 small commits.
