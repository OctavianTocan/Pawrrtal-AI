---
# pawrrtal-ey9p
title: Improve sentrux quality score with targeted refactors
status: in-progress
type: feature
priority: normal
created_at: 2026-05-03T21:26:00Z
updated_at: 2026-05-06T16:58:32Z
---

Use sentrux as measurement loop; reduce equality/modularity bottlenecks by extracting project-owned large modules while preserving behavior.

## Gate cleanup plan

- [x] Fix full repository check failures without weakening gates
- [x] Replace vendored react-resizable-panels with the npm package cleanly
- [x] Re-run typecheck, Biome, tests, and sentrux
- [x] Identify next high-leverage sentrux score work

## Next score work

- [ ] Split prompt-input into smaller modules with colocated tests
- [ ] Add focused tests for glass helpers and prompt-input attachment/submit behavior
- [ ] Measure the next sentrux score after each small slice

## Sentrux scan scope update

- [x] Exclude agent/rule/skill tooling roots from sentrux by routing local and CI checks through scripts/sentrux-check.sh.
- [x] Verify filtered sentrux gate with just sentrux.

## 2026-05-06 investigation synthesis

Live sentrux scan (Wed May 6 18:42 UTC+2):

- **quality_signal: 6882** (up from 6753 ADR baseline)
- **bottleneck shifted: equality (5802) -> modularity (5468)**
- acyclicity 10000, redundancy 7298, depth 6667
- DSM: 0 upward edges, clean layering, but no natural clusters detected
- backend layering clean; frontend is the entire source of the modularity penalty
- 583 / 932 import edges cross module boundaries (63%)

### New child beans (modularity hotspots)

- pawrrtal-lqs4 (P1) - Promote personalization/storage -> lib/personalization/ (~7 edges)
- pawrrtal-q8p8 (P2) - Hoist CONVERSATION_DRAG_MIME + conversation primitives -> lib/conversations/
- pawrrtal-yl6q (P2) - Move settings/primitives -> ui-primitives/
- pawrrtal-3rqh (P2, draft) - Resolve projects<->nav-chats sidebar composition

### Adjacent findings (created as own beans)

- pawrrtal-8nw3 (P1, bug) - NavChatsView.tsx is 509 lines, currently failing line-budget gate
- pawrrtal-y2tt (P2) - app-layout.tsx (645 LOC, exempted via TODO with no follow-up bean until now)
- pawrrtal-9vft (P3) - Delete self-documented dead duplicate UseConversationMutations.ts
- pawrrtal-anju (P1, bug) - No CI workflow runs bun run check or unit tests; AGENTS.md claim is incorrect
- pawrrtal-owse (P3, draft) - sentrux OSS only checks 4/17 rules; evaluate Pro vs alternatives

### Evidence kept out of beans

- Equality bottleneck is dominated by frontend/lib/types.ts (33 importers). Splitting it is plausible but mostly redistributes fan-in without reducing real coupling; explicitly **not** filed as a refactor bean.
- frontend/lib/api.ts (152 LOC, 18 importers, 15 commits/90d) is a healthy endpoint registry; high fan-in is desirable. Not a target.
- Depth raw 4 / score 6667 is structurally bounded by the 5-layer rule; not actionable.
- frontend/components/ui/sidebar.tsx (773 LOC) is shadcn-vendored and explicitly exempted; only 5 importers, not a fan-in problem.
