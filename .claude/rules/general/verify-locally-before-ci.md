---
name: verify-locally-before-ci
paths: ["**/*"]
---

# Verify Locally Before CI

Run the project's full local verification suite (`pnpm check`, `pnpm test`, `tsc --noEmit`, etc.) before pushing to CI. Don't use CI as your test runner.

## Rule

Before `git push`:

1. Run the formatter: `pnpm format` or `biome check --fix`
2. Run type checks: `tsc --noEmit` or `pnpm typecheck`
3. Run tests: `pnpm test` or `vitest run`
4. Run linting: `pnpm lint` or `biome lint`

If the project has a unified check command (`pnpm check`), run that.

## Why

Each CI run costs time and money. A CI failure that could've been caught locally wastes 5-30 minutes of pipeline time and blocks other PRs. On self-hosted runners, it also blocks the physical machine for other team members.

## Verify

"Did I run the full local check suite before pushing? Could this failure have been caught locally?"

## Patterns

Bad — push without local verification:

```bash
git add -A && git commit -m "feat: new feature" && git push
# CI fails: type error on line 42
# 15 minutes wasted, runner blocked for the team
```

Good — local verification first:

```bash
pnpm check  # format + typecheck + lint + test
# Fix any issues locally
git add -A && git commit -m "feat: new feature" && git push
# CI passes on first try
```
