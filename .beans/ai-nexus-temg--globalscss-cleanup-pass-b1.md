---
# ai-nexus-temg
title: globals.css cleanup pass (B1)
status: todo
type: task
priority: low
created_at: 2026-05-07T09:32:09Z
updated_at: 2026-05-07T09:58:53Z
---

One-pass cleanup of `frontend/app/globals.css` (currently 1554 lines). NOT a full split into multiple files — that's not idiomatic in Tailwind v4 + shadcn.

## Cleanup tasks

1. **Group all @keyframes into one section** — currently scattered across L617-1287 (dropdown-open/close, shimmer, shimmer-loading, shimmer-text, thinking-gradient-flow, onboarding-panel-enter, composer-placeholder-enter, spinner-grid, waveform-scroll, toast-in, shake). Move them into a single 'Animations' section after `@layer utilities`.

2. **Dedupe Sonner toast tinting** (L1391-1446) — 6 repeated `linear-gradient(rgba(...))` blocks. Replace with CSS variables for the alpha and a single rule per toast type.

3. **Consolidate scenic-mode glass blocks** — L902-958 has three separate blocks defining similar `backdrop-filter: blur()` + ::before pseudo gradients. Extract into a single `.glass-panel` rule and apply the class via the existing selectors.

4. **Collapse Radix overlay disables** (L964-994) into a single selector list with `animation: none \!important` — currently each Radix data-attribute has its own rule.

5. **Consistent comment-block dividers** — use the same style for all section breaks (currently mix of `/* === */`, `/* SECTION === */`, plain `/* note */`).

## Out of scope

- Splitting into multiple files
- Renaming CSS custom properties
- Changing any token values
- Touching the @theme block

## Tasks

- [ ] Move all @keyframes to a unified 'Animations' section
- [ ] Replace 6 Sonner tinting blocks with var-driven single rule
- [ ] Extract scenic-mode glass into reusable rule
- [ ] Collapse Radix overlay animation disables
- [ ] Normalize section divider comment style
- [ ] Verify line count drops materially (target ~1300 lines, no semantic changes)
- [ ] Visual regression spot-check: toast variants, dropdown open/close, scenic mode, onboarding panels



## Progress

- [x] **Sonner toast tinting deduplicated.** 6 nearly-identical `background` blocks (3 light + 3 dark) collapsed into a CSS-variable-driven pattern: each `data-type` sets `--toast-tint` to its semantic-color RGB triple, then 2 shared rules paint the gradient + title color. Same for the dark-mode tint bump. Net: ~50 LOC → ~30 LOC, far cleaner intent.
- [x] **Radix overlay disables collapsed.** 7 separate selector blocks each setting `animation: none \!important` merged into a single multi-selector rule with the dropdown-menu carve-out documented in the rule's comment.
- [ ] Group all @keyframes into one section (still scattered across L617-1287; bigger move)
- [ ] Consolidate scenic-mode glass blocks (still 3 separate rules)
- [ ] Normalize section comment-block dividers

## Verification

- `tsc --noEmit` clean
- 130/130 package tests still pass

## Deferred

The remaining cleanup tasks (keyframe consolidation, scenic-mode glass merge, comment-divider normalization) are bigger moves that risk subtle ordering breakage and warrant their own focused pass with visual regression checks. Tracking-only for now.
