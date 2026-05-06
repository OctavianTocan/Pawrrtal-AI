---
# ai-nexus-aeas
title: Decide customization scope for the rebuilt theming system
status: todo
type: task
priority: high
created_at: 2026-05-06T12:54:06Z
updated_at: 2026-05-06T12:54:06Z
parent: ai-nexus-9kov
---

Pick one:

(A) Users edit only the small set of base color slots. Derivative surfaces always derive via formula.
(B) Users edit base slots AND a small set of named surfaces (e.g. `surface-raised`).
(C) No user customization at all. Theme is hardcoded; we ship a couple of curated presets.

The 2026-05-06 rip happened because option (A) was in place but the formulas relative to the base slots produced visually unacceptable results (gray cast on a warm-foreground default), and there was no way for the user to override the derivative.

Whichever option is picked, the choice has to be made BEFORE the rebuild starts, and documented in the ADR / DESIGN.md.

## Decision criteria

- Will users want to customize chat panel / popover surfaces directly? (PMF question.)
- Can option (A) work if we pin the formula better (e.g. `oklch(from canvas l + 0.04 c h)` vs the broken `color-mix(srgb, fg 4%, bg)`)?
- Cost of (B): expanded schema, expanded API, expanded UI.
- Cost of (C): no per-user theming, but eliminates the entire surface-formula problem.

## TODO
- [ ] Discuss + pick
- [ ] Update ADR with the choice + rationale
- [ ] Sketch schema if (B)
