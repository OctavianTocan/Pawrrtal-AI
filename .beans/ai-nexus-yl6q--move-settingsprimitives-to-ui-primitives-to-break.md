---
# pawrrtal-yl6q
title: Move settings/primitives to ui-primitives/ to break whimsy↔settings back-edge
status: todo
type: task
priority: normal
tags:
    - sentrux
    - modularity
    - refactor
created_at: 2026-05-06T16:51:39Z
updated_at: 2026-05-06T16:51:39Z
parent: pawrrtal-ey9p
---

## Why

`frontend/features/whimsy/index.tsx` imports from `@/features/settings/primitives`, while `frontend/features/settings/sections/AppearanceSection.tsx` imports from `@/features/whimsy`. No file-level cycle exists (so acyclicity remains 10000), but at the feature level there is a back-edge that the modularity score penalizes.

`settings/primitives` is — by name and role — a primitives layer. Per `.sentrux/rules.toml` the canonical place for shared visual primitives is `ui-primitives/` (or `lib/` for non-visual helpers).

## Plan

- [ ] Audit `frontend/features/settings/primitives/*` exports; classify each as
  - (a) generic visual primitive → `frontend/components/ui-primitives/` (or wherever the project keeps shadcn-style primitives), or
  - (b) settings-specific composition → keep inside `features/settings/`
- [ ] Move (a) to `ui-primitives/`; update all importers (whimsy, settings sections, anywhere else)
- [ ] Re-run sentrux; verify whimsy↔settings edge is gone
- [ ] `just check`, typecheck, tests, design lint (`bun run design:lint`)

## Cross-feature importers (current)

- `frontend/features/whimsy/index.tsx` → `@/features/settings/primitives`
- `frontend/features/chat/ChatView.tsx` → `@/features/whimsy`
- `frontend/features/settings/sections/AppearanceSection.tsx` → `@/features/whimsy`

## Expected impact

Removes the whimsy↔settings back-edge plus 1–2 other edges if `whimsy` exports also turn out to be primitives. Improves modularity *and* equality (primitives become a properly-shared low layer rather than a feature with high fan-in).

## Notes

- Honor the design system: any moved component must keep its current Tailwind tokens and not introduce literal colors. `DESIGN.md` is the source of truth.
