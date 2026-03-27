---
# ai-nexus-1dko
title: Adopt web-ce-shared-packages Biome & TSConfig patterns for AI Nexus
status: completed
type: task
priority: normal
created_at: 2026-03-27T16:03:54Z
updated_at: 2026-03-27T16:24:14Z
---

Research and plan how to bring the stricter Biome linting, custom policies, and TSConfig patterns from .private/web-ce-shared-packages into the AI Nexus project.


## Summary of Changes

- Updated `biome.json` with all formatting conventions (spaces, single quotes, 100-char lines) and stricter linting rules (noExplicitAny, useImportType/useExportType, useConst, complexity caps, etc.)
- Bumped Biome from 2.4.4 to 2.4.8
- Enabled VCS integration in Biome config
- Added test file overrides (relax any/console/complexity)
- Updated `tsconfig.json` with `noUnusedParameters: true` and `forceConsistentCasingInFileNames: true`
- Ported `check-docstrings.mjs` as `check-policies.mjs` (JSDoc + 400-line file limit enforcement)
- Added `lint:policies` script to root `package.json`
- Updated Justfile: `lint` is now read-only check + policies, added `lint-fix` for auto-fix
- Config-only: no reformatting applied to existing code
