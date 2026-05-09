---
# pawrrtal-78ep
title: Onboarding polish and interaction direction
status: completed
type: task
priority: normal
created_at: 2026-05-02T21:41:19Z
updated_at: 2026-05-02T21:46:22Z
---

Make onboarding cards non-selectable, align radii/surfaces with app design tokens/sidebar conventions, evaluate Hugeicons solid-standard usage, and propose mouse-interactive vortex ideas from design skills.

## Summary of Changes

- Made onboarding panels and option cells non-selectable with `select-none`.
- Changed onboarding panel, option, input, and button radii toward the sidebar/menu token feel by using the app small-radius `rounded-xl` convention in this root token setup.
- Tightened active states to `scale-[0.96]` and replaced broad transitions with targeted transition properties.
- Researched Hugeicons Solid Standard. The requested style is a Pro package (`@hugeicons-pro/core-solid-standard`) served through Hugeicons Pro/private registry, not the public npm registry used by this repo.
- Prepared mouse-interactivity directions for the canvas vortex instead of implementing a throwaway pointer effect.

## Verification

- `bun run typecheck`
- Scoped Biome check on onboarding and globals; only existing unrelated `globals.css` important-style warnings remain.
