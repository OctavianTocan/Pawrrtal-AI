# Curated Claude rules (Pawrrtal)

Highest-signal defaults for this Next.js + FastAPI + Biome + Bun stack. The full `.claude/rules/` tree has additional coverage; this is the recommended reading order for onboarding.

Each rule below lives at the cited path with `paths:` frontmatter, so Claude only loads it when working on a matching file. To force-load one, ask Claude to read it.

## Debugging & incidents

- `.claude/rules/general/read-data-before-theory.md`
- `.claude/rules/general/diagnose-before-workaround.md`
- `.claude/rules/general/stop-after-two-failed-fixes.md`
- `.claude/rules/debugging/compare-working-vs-broken-before-fixing.md`

## TypeScript

- `.claude/rules/typescript/never-bypass-type-system-with-any-or-unsafe-cast.md`
- `.claude/rules/typescript/explicit-return-types-everywhere.md`
- `.claude/rules/typescript/validate-boundaries.md`
- `.claude/rules/typescript/discriminated-unions.md`
- `.claude/rules/typescript/function-signatures-must-be-honest.md`
- `.claude/rules/typescript/use-direct-named-imports-not-namespace.md`

## React (client UI)

- `.claude/rules/react/avoid-stale-closures-and-mutating-state.md`
- `.claude/rules/react/use-primitive-values-as-effect-dependencies.md`
- `.claude/rules/react/purity-in-memo-and-reducers.md`
- `.claude/rules/react/stable-keys.md`
- `.claude/rules/react/request-id-cancellation.md`
- `.claude/rules/react/portal-escape-overflow.md`

## API & fetch boundaries

- `.claude/rules/api/validate-response-shape-at-boundary.md`
- `.claude/rules/api/abort-controller-per-request.md`
- `.claude/rules/error-handling/check-response-before-parse.md`

## Auth (sessions/tokens)

- `.claude/rules/auth/deduplicate-concurrent-token-refreshes.md`
- `.claude/rules/error-handling/timeout-async-auth.md`

## Errors & async

- `.claude/rules/error-handling/abort-error-is-expected.md`
- `.claude/rules/error-handling/reset-flags-in-finally.md`
- `.claude/rules/error-handling/catch-promise-chains.md`

## Testing

- `.claude/rules/testing/vi-hoisted-for-mock-variables.md`
- `.claude/rules/testing/factory-over-shared-mutable.md`
- `.claude/rules/testing/test-isolation-ephemeral.md`
- `.claude/rules/testing/agent-loop-testing-philosophy.md` — backend agent-loop & StreamFn tests
- `.claude/rules/playwright/web-first-assertions.md`
- `.claude/rules/playwright/role-selectors.md`
- `.claude/rules/playwright/no-networkidle.md`

## Monorepo & Biome

- `.claude/rules/monorepo/single-lockfile-per-workspace.md`
- `.claude/rules/monorepo/biome-version-aware-config.md`
- `.claude/rules/general/biome-2-migration-gotchas.md`

## Git & PRs

- `.claude/rules/git/one-concern-per-pr.md`
- `.claude/rules/git/conventional-commits.md`

## AI review / sweep

- `.claude/rules/sweep/read-type-signatures-before-use.md`
- `.claude/rules/sweep/review-comments-are-patterns.md`

## Vendored Cursor rules (`.cursor/rules/`)

External Cursor rules are vendored under `.cursor/rules/`. Each file is `.mdc` with YAML frontmatter: `description`, `globs` (and sometimes duplicate `paths`), and `alwaysApply` (when `true`, the rule applies broadly instead of only to glob matches).

A parallel snapshot lives at `.claude/rules/cursor-vendored/` for reference and diffing alongside the main claude-rules vendored tree. Claude Code's rule loader only reads `.md`, so these `.mdc` files cost zero context — they're disk-only documentation. Use the `.md` rules listed above for Claude path-scoped enforcement.
