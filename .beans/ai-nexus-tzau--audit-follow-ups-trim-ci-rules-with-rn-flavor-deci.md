---
# ai-nexus-tzau
title: 'Audit follow-ups: trim ci/ rules with RN flavor + decide thirdear-cursor snapshot'
status: todo
type: task
priority: low
tags:
    - rules
    - tooling
    - tech-debt
created_at: 2026-05-06T17:17:40Z
updated_at: 2026-05-06T17:17:40Z
---

## Context

The 2026-05 rules + skills audit cleared the obvious stack-mismatched directories (`.claude/rules/{react-native,expo,brownfield,rust,twinmind}/` — 42 files) and fixed `src/` -> `frontend/` glob drift in 7 Cursor rules. Two outstanding follow-ups remain.

## Follow-up 1: trim `ci/` rules whose subjects are RN-native-only

`.claude/rules/ci/` has 47 files. ~33 of them mention RN/native concepts (gradle, soloader, xcframeworks, hermes, expo, podfile, xcode, kotlin, swift, brownfield) in their bodies, even though the underlying *insight* is sometimes universal (e.g. `audit-secrets-across-workflows.md`, `clean-self-hosted-runner-between-runs.md`, `no-heredoc-in-yaml-run.md`).

Two options:

- **(a)** Mass-delete the RN-flavored CI rules. Cheap, fast, but loses universal kernels buried inside RN-flavored examples.
- **(b)** Triage one-by-one — keep + rewrite the universally-true rules with non-RN examples; delete the rest.

Option (b) is the right answer but takes ~2 hours. Defer until a contributor needs to touch CI workflows next.

Sample classification list saved to `/tmp/claude-rules-audit.json` from the audit run; reproduce with:

```
cd backend && uv run python /tmp/audit-claude-rules-v2.py
```

## Follow-up 2: decide the fate of `.claude/rules/thirdear-cursor/`

`.claude/rules/thirdear-cursor/` contains 26 `.mdc` files — a snapshot of the TwinMind `.cursor/rules/` tree. They are NOT loaded by Claude Code (Claude reads `.md`, not `.mdc`). The repo's AGENTS.md describes them as "for reference and diffing alongside the main claude-rules vendored tree."

Options:

- **Keep**: harmless (zero context cost), but adds 26 files of visual noise to the rules tree and risks confusing future contributors who think they are active rules.
- **Move** to `docs/decisions/2026-05-twinmind-cursor-rules-snapshot/` so it is explicitly a historical reference, not a rule directory.
- **Delete**: simplest. We already have the canonical tree at `.cursor/rules/` and the upstream repo at `OctavianTocan/claude-rules`.

Recommendation: move to `docs/decisions/` if any of those rules has unique value not present in the canonical `.cursor/rules/`; otherwise delete.

## Follow-up 3 (optional): audit always-applied Cursor rules content

Three Cursor rules use `alwaysApply: true` (`check-solutions-first.mdc`, `no-backwards-compat.mdc`, `stagehand-v3-typescript.mdc`). All three look genuinely universal but a content review for ai-nexus accuracy is worth doing once.

## Acceptance

- [ ] Decision recorded for the `ci/` rules (delete-many or rewrite-many).
- [ ] Decision recorded for `thirdear-cursor/` snapshot.
- [ ] If applicable, ADR in `docs/decisions/` capturing why we trimmed the vendored set.
