---
# pawrrtal-102x
title: Align Biome config with TwinMind RN parity
status: completed
type: task
priority: normal
created_at: 2026-05-03T20:35:47Z
updated_at: 2026-05-03T20:37:44Z
---

Port linter rules, assists, CSS/test overrides from ThirdEar react-native/biome.json; bump Biome to 2.4.10; preserve pawrrtal vendor/layout overrides.



## Summary of Changes

- Extended biome.json with TwinMind-equivalent linter rules (complexity, suspicious, correctness, style).
- Bumped @biomejs/biome to 2.4.10; added frontend devDependency @tanstack/react-query-devtools.
- Preserved Pawrrtal overrides (globals.css noImportantStyles, vendor disables, layout.tsx dangerouslySetInnerHTML); added overrides for commit/dev tooling scripts, .agents/**.
- Kept formatter at 2 spaces / width 100 (TwinMind uses tabs — intentional divergence).
- Fixed surfaced violations (unused import, node:path import, fragment, stale biome-ignore comments, empty callback stub; formatted JSON configs).
- Root index.ts stub replaced console hello with empty export.
