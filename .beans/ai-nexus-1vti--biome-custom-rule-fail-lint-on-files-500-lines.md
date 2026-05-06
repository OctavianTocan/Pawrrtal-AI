---
# ai-nexus-1vti
title: 'Biome custom rule: fail lint on files > 500 lines'
status: completed
type: task
priority: normal
created_at: 2026-05-04T20:57:52Z
updated_at: 2026-05-04T21:19:33Z
---

Add a custom Biome lint rule (or configure existing Biome rule + GH plugin) that errors out when any source file exceeds 500 lines.

## Approach options
- A. Use Biome's noExcessiveLinesPerFunction at file scope — not directly supported
- B. Custom Biome plugin (Biome supports JS-based plugins from 2.x)
- C. Pre-commit hook that runs `wc -l` against staged files (fallback if Biome plugin path is heavy)

## Acceptance
- Lint fails (error severity) if any .ts/.tsx file > 500 lines
- Document escape hatch (per-file directive) if needed

## Summary of Changes

- New scripts/check-file-lines.mjs walks frontend/ + backend/ and exits non-zero when any .ts/.tsx/.py file exceeds MAX_LINES (default 500).
- Wired into root package.json as `lint:file-lines` and into frontend/package.json as `check` (alongside biome + tsc).
- Skips: node_modules, build dirs, alembic, packages, tests/, __tests__/, .test.* / .spec.* / .d.ts files.
- Per-path exemptions:
  - `frontend/components/ui/` — shadcn-generated primitives (Biome already exempts the same path).
  - `frontend/components/app-layout.tsx` — pre-existing 527-line file, marked with TODO to split later.
- Refactor required by the new rule:
  - Extracted `ConversationIndicators` from NavChatsView.tsx into its own file (the big base + plan SVG glyphs).
  - Extracted `SearchCountBadge` into its own file.
  - NavChatsView.tsx is now under 500 lines.

### Why a sibling script and not a Biome plugin
Biome 2.x ships GritQL-based plugins, but GritQL has no native way to query whole-file line count — its pattern-matching is structural. The sibling script runs alongside `biome check` in the project's `check` task, so the developer ergonomics are identical: a single command fails on either kind of issue. When Biome adds a `noExcessiveLinesPerFile` rule (or equivalent), this script can be retired.

### Override
\`MAX_LINES=400 node scripts/check-file-lines.mjs\` for a tighter budget.
