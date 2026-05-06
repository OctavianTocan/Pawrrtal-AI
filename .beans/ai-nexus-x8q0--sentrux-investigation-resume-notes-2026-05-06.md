---
# ai-nexus-x8q0
title: Sentrux investigation — resume notes (2026-05-06)
status: draft
type: task
priority: low
tags:
    - sentrux
    - investigation
    - resume
created_at: 2026-05-06T17:00:58Z
updated_at: 2026-05-06T17:00:58Z
parent: ai-nexus-ey9p
---

## Where we left off

Session of 2026-05-06 18:42-19:00 (UTC+2). Read this bean first when picking the investigation back up.

## What we measured

- Live sentrux scan: `quality_signal = 6882` (ADR baseline 6753).
- Bottleneck shifted: equality (5802) -> **modularity (5468)**.
- DSM clean (0 upward edges, 11 layers, no detected clusters).
- 583/932 import edges cross module boundaries — frontend-side only; backend layering is clean.
- Health, DSM, check_rules, test_gaps, git_stats all run; saved snapshots in chat.
- check_rules: 4 of 17 rules actually checked (OSS limitation).
- test_gaps: 168 tested / 1182 untested files (12.4% file-coverage).
- git_stats: 279 commits / 506 churn files / 30 hotspots / 84% single-author over 90 days.
- File-line budget: NavChatsView.tsx is *currently* in violation (509 LOC) and CI did not catch it.

## Beans created this session

Modularity hotspots (parented under ai-nexus-ey9p):
- ai-nexus-lqs4 (high) — Promote `personalization/storage` -> `lib/personalization/`
- ai-nexus-q8p8 (normal) — Hoist `CONVERSATION_DRAG_MIME` + conversation primitives -> `lib/conversations/`
- ai-nexus-yl6q (normal) — Move `settings/primitives` -> `ui-primitives/`
- ai-nexus-3rqh (normal, draft) — Resolve `projects` <-> `nav-chats` composition

Adjacent findings:
- ai-nexus-8nw3 (high, bug) — Split NavChatsView.tsx (active line-budget violation)
- ai-nexus-y2tt (normal) — Split app-layout.tsx (exempted via TODO without follow-up)
- ai-nexus-9vft (low) — Delete dead-duplicate UseConversationMutations.ts
- ai-nexus-anju (high, bug) — Wire `bun run check` + tests into CI (gating gap)
- ai-nexus-owse (low, draft) — Evaluate sentrux Pro vs alternatives for missing 13 rules

## Things deliberately not filed (with rationale)

- Splitting `frontend/lib/types.ts` (33 importers) — would redistribute fan-in without reducing real coupling; 124 LOC of clean domain types.
- `frontend/lib/api.ts` (18 importers, 15 commits/90d) — healthy endpoint registry; high fan-in is its job.
- `frontend/components/ui/sidebar.tsx` (773 LOC) — shadcn-vendored, only 5 importers.
- Depth (raw 4) — bounded by the 5-layer architecture rule; not actionable.
- ADR addendum for the bottleneck shift — captured in `ai-nexus-ey9p` synthesis section; promote to ADR when the first refactor lands.

## Open investigation paths (pick one to resume)

1. **Inventory the 13 unchecked sentrux rules** — read `.sentrux/rules.toml`, classify which 4 are checked vs which 13 are silently un-enforced. Cheapest, highest "false confidence" payoff.
2. **Backend equality drill** — `backend/app/schemas.py` (284 LOC) and `backend/app/models.py` are likely backend godfiles. Run a fan-in count on backend imports to confirm.
3. **Manual churn x complexity x test-coverage triangulation** — sentrux git_stats says 30 hotspots but does not list them. Rebuild the list with `git log` + `wc -l` + test-presence heuristic to get a concrete refactor target list.
4. **Re-check parent bean ai-nexus-ey9p in-progress tasks** — its remaining "split prompt-input + add focused tests" tasks were prioritized when equality was the bottleneck. With the bottleneck shifted, decide whether they should be deprioritized or removed.

## Tooling notes (do not lose)

- `node scripts/check-file-lines.mjs` runs locally but **not in CI** (covered by ai-nexus-anju).
- Sentrux MCP results are cached per-session by the `scan` tool — call `rescan` if rerunning after edits.
- `beans show ai-nexus-ey9p` is the one place to see all child task IDs.
