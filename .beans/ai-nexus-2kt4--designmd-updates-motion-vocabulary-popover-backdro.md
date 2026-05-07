---
# ai-nexus-2kt4
title: 'DESIGN.md updates: motion vocabulary + popover backdrop-blur globalization'
status: completed
type: task
priority: normal
created_at: 2026-05-07T09:31:57Z
updated_at: 2026-05-07T09:38:16Z
---

Update DESIGN.md to reflect the new motion vocabulary and popover spec changes that ai-nexus-yyug introduces.

## Sections to update

### Motion section (lines 486-518)

Current: documents the sidebar-slide pattern + reduced-motion. Add a new subsection:

> ### Open / close timing
>
> Overlays (dropdowns, popovers, tooltips) follow Linear-snappy timing:
>
> | Direction | Duration | Easing |
> |---|---|---|
> | Open  | 140 ms | cubic-bezier(0.16, 1, 0.3, 1) (ease-out-expo) |
> | Close | 100 ms | cubic-bezier(0.7, 0, 0.84, 0) (ease-in-quint) |
>
> Animate **opacity + scale + y + filter: blur(8px)** on enter/exit. The blur transition makes overlays feel like they're coming into focus rather than abruptly appearing. Reduced-motion collapses to opacity-only.
>
> Larger surfaces (sheets, modals, full-screen overlays) use proportionally longer durations: 220 ms / 180 ms for sheets, 280 ms / 220 ms for full-screen.

### Components → popover spec (line 526)

Current: "In scenic mode, gains a 24px backdrop blur."

Change to: "Always renders with an 8 px backdrop blur and an 88% background tint, so background content reads through softly. Scenic mode increases the blur to 24 px for the heavier glass effect."

### Components → chat-composer-dropdown-menu spec (line 528-531)

Currently mentions 14 px radius and `--foreground-5` background. After unification, all dropdowns share the new globalized blur — note that this surface inherits popover-styled and adds only the elevated background + larger radius.

## Tasks

- [ ] Add 'Open / close timing' subsection to Motion section
- [ ] Update popover spec (line 526) — globalize backdrop-blur language
- [ ] Update chat-composer-dropdown-menu reference if needed
- [ ] Run `bun run design:lint` to verify spec validates
- [ ] Run `bun run design:diff` against the previous version to confirm only intentional changes



## Summary of changes

- DESIGN.md Motion section — new 'Open / close timing' subsection documenting Linear-snappy 140/100 ms timing, ease-out-expo open / ease-in-quint close, filter blur on enter/exit, and the duration table for larger surfaces (sheets, modals, full-screen).
- DESIGN.md popover spec (line 558-562) — backdrop-blur language updated from 'In scenic mode, gains a 24px backdrop blur' to 'Always renders with an 8 px backdrop blur and an 88% background tint... Scenic mode bumps the blur to 24 px for the heavier glass effect.'
- The pre-existing 'Sidebar Open / Close' subsection already specifies the correct translate-don't-resize pattern; no changes needed there.

## Verification

- `bun run design:lint` — 0 errors, 1 warning, 1 info (all pre-existing)
