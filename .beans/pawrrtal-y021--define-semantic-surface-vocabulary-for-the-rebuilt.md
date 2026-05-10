---
# pawrrtal-y021
title: Define semantic surface vocabulary for the rebuilt theming system
status: todo
type: task
priority: high
created_at: 2026-05-06T12:53:58Z
updated_at: 2026-05-06T12:53:58Z
parent: pawrrtal-9kov
---

Pick a vocabulary of surface tokens that names what surfaces are *for*, not how dark they are. Strawman:

- `--surface-canvas` — sidebar / page background
- `--surface-raised` — chat panel, settings cards
- `--surface-recessed` — connect-apps strip, footer bands
- `--surface-overlay` — popovers, modals, dropdowns

Decide:

1. How many surface levels we actually need (3? 4? 5?).
2. What each surface is for, listed by component.
3. Whether each surface has its own formula (e.g. canvas = `--background`, raised = +0.04 lightness, etc.) or whether they're explicit literal values per theme.
4. Whether the formula is identical in light and dark, or whether the spec explicitly forks them (with documented reason).

## Why this is a blocker

The rebuild can't proceed without this — every other follow-up depends on what surfaces exist and how they relate.

## TODO
- [ ] Decide surface count + roles
- [ ] Pick derivation formula(s)
- [ ] Document in DESIGN.md (or a draft section)
- [ ] Map each existing component to a surface
