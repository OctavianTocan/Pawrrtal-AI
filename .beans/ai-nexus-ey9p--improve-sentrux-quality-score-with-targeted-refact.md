---
# ai-nexus-ey9p
title: Improve sentrux quality score with targeted refactors
status: in-progress
type: feature
priority: normal
created_at: 2026-05-03T21:26:00Z
updated_at: 2026-05-03T22:00:23Z
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
