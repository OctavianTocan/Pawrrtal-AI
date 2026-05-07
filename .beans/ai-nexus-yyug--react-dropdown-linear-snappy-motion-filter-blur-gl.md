---
# ai-nexus-yyug
title: 'react-dropdown: Linear-snappy motion + filter blur + globalized backdrop blur'
status: completed
type: feature
priority: high
created_at: 2026-05-07T09:30:23Z
updated_at: 2026-05-07T09:38:03Z
---

Set the motion vocabulary for the entire app's overlay system. All other dropdown/popover work depends on these defaults landing first.

## Changes

### `DropdownRoot` defaults

- `enterDuration` default: 0.2 → **0.14** (140 ms)
- `exitDuration` default: 0.15 → **0.10** (100 ms)
- `enterEase` default: `[0.16, 1, 0.3, 1]` (ease-out-expo, kept)
- `exitEase` default: `[0.7, 0, 0.84, 0]` (ease-in-quint, NEW — was implicitly enterEase)

### `DropdownContent` motion variants

Animate `filter: blur(8px)` alongside opacity + scale + y on enter/exit:

```ts
initial: { opacity: 0, scale: 0.96, y: -6, filter: 'blur(8px)' }
animate: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
exit:    { opacity: 0, scale: 0.96, y: -6, filter: 'blur(8px)' }
```

Reduced-motion path collapses to opacity-only (no blur, no scale, no y).

### Globalize backdrop blur

```css
.popover-styled {
  background: color-mix(in srgb, var(--background) 88%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  /* existing layered shadow */
}
```

Currently only applied via `html[data-scenic] .popover-styled` (`globals.css:942-945`). Promote to base `.popover-styled` so every menu/popover gets frosted glass.

## Dependencies

- DESIGN.md Motion section needs the new timings + filter blur callout
- DESIGN.md popover spec line 526 ("In scenic mode, gains a 24px backdrop blur") needs revising to global

## Tasks

- [ ] Update `enterDuration` / `exitDuration` / `enterEase` / `exitEase` defaults in `DropdownRoot`
- [ ] Update motion variants in `DropdownContent` to include `filter: blur`
- [ ] Update reduced-motion variants to skip blur
- [ ] Update `popover-styled` in `globals.css` to add `backdrop-filter: blur(8px)` + 88% background
- [ ] Update `@property` for `--popover-bg-tint` if needed (so backdrop blur transitions cleanly)
- [ ] Update `useAnimationStateTracker` hook in `DropdownRoot` to use the new exit duration
- [ ] Run `bunx vitest run` (in package dir) — all 130 tests still pass
- [ ] DESIGN.md Motion section — add Linear-snappy timing table + filter blur pattern
- [ ] DESIGN.md popover spec — globalize backdrop blur language
- [ ] CHANGELOG entry under Unreleased: 'Linear-snappy motion defaults + filter blur on enter/exit + global backdrop blur on popover-styled'



## Summary of changes

- `DropdownRoot.tsx` — `enterDuration` default 0.2 → 0.14, `exitDuration` default 0.15 → 0.10. `exitEase` default added (`[0.7, 0, 0.84, 0]`, ease-in-quint), independent of `enterEase` (kept as `[0.16, 1, 0.3, 1]`, ease-out-expo).
- `DropdownContent.tsx` — motion variants now animate `filter: blur(8px)` on enter/exit alongside opacity, scale, y. Reduced-motion variants strip the blur (and scale + y) per the existing `useReducedMotion` integration.
- `globals.css` — `.popover-styled` now applies `backdrop-filter: blur(8px)` and an 88% background tint via `color-mix(in srgb, var(--background) 88%, transparent)`. Scenic mode override at `html[data-scenic] .popover-styled` continues to bump the blur to 24 px.
- `DESIGN.md` Motion section — new 'Open / close timing' subsection documenting the 140/100 ms vocabulary and the filter-blur rule. Popover spec updated to globalize the backdrop blur language.
- `CHANGELOG.md` (package) — Unreleased motion overhaul section.

## Verification

- `bunx tsc --noEmit` (frontend) — 0 errors
- 130/130 package tests pass
