---
# pawrrtal-pohh
title: Codify 'how to add a surface token' as a single procedure
status: todo
type: task
priority: normal
created_at: 2026-05-06T12:54:18Z
updated_at: 2026-05-06T12:54:18Z
parent: pawrrtal-9kov
---

Adding a new surface token to the old system required three coordinated edits:

1. Define `--token-name` in `:root` (with formula).
2. Override `--token-name` in `.dark` (independent formula — drift risk).
3. Add `--color-token-name: var(--token-name)` to `@theme inline` so Tailwind generates a utility.

Forget any one of those and the token silently breaks (in dark mode, in light mode, or as a Tailwind utility).

The rebuild needs ONE procedure that touches all the right places at once.

## Options

- A CSS macro / SCSS partial that expands into the three places.
- A small build-time script that reads a single surface-tokens manifest and writes globals.css + Tailwind theme block.
- A documented checklist + a regression test that fails if a new `--token-*` lands without the matching `@theme` entry.

Pick one. Document in DESIGN.md.

## TODO
- [ ] Pick mechanism
- [ ] Implement
- [ ] Document procedure
- [ ] Add regression test if applicable
