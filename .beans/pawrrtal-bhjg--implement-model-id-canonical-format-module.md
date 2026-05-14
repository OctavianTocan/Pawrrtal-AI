---
# pawrrtal-bhjg
title: Implement model_id canonical-format module
status: completed
type: task
priority: high
created_at: 2026-05-14T06:22:58Z
updated_at: 2026-05-14T06:26:09Z
blocked_by:
    - pawrrtal-5854
---

ADR docs/decisions/2026-05-14-model-id-canonical-format-and-backend-catalog.md §2. Pure additive: Vendor/Host enums, ParsedModelId, parse_model_id, InvalidModelId, UnknownModelId. No consumers wired yet.

## Summary
Module landed: Vendor/Host enums, ParsedModelId, parse_model_id, InvalidModelId, UnknownModelId, CANONICAL_HOST. 12 tests pass; ruff + mypy clean.

**Deviation from plan:** removed `Vendor.openai` from the enum. The plan declared it but provided no `CANONICAL_HOST` entry for it, and the spec test `test_canonical_host_covers_every_vendor` requires every Vendor to have a CANONICAL_HOST entry. No catalog entry, no Host, and no consumer references openai in Task 1/2, so dropping the unused member was the minimal change to satisfy the invariant. Re-add when an OpenAI host and catalog entry land.

**Lint deviation:** added `# noqa: N818` on InvalidModelId and UnknownModelId — ruff's pep8-naming wants an `Error` suffix, but the plan documents these exact names as the public API consumed by future tasks (parser, catalog, resolver). Renaming would cascade across the whole plan.
