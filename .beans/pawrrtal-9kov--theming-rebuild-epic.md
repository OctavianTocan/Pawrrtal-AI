---
# pawrrtal-9kov
title: Theming rebuild — epic
status: todo
type: epic
priority: high
created_at: 2026-05-06T12:53:22Z
updated_at: 2026-05-06T12:53:22Z
---

Container epic for the theming-system rebuild that follows the 2026-05-06 rip.

See `frontend/content/docs/handbook/decisions/2026-05-06-rip-theming-system.md` for the snapshot of what was ripped and why. The system was deleted because the user-controllable surface (6 color slots) was too small to drive the surfaces users actually wanted to edit, derivative-token formulas drifted between light and dark modes, naming was overloaded ("background" meant six different things), and components consumed surfaces via four parallel mechanisms with no canonical pattern.

The rebuild is gated on a small number of decisions (semantic surface vocabulary, customization scope, canonical consumption mechanism). Sub-beans track those decisions plus the cleanup work (audit globals.css, remove backend routes, restore dark-mode toggle, update DESIGN.md, etc.).

## Scope

In: theming tokens, surface vocabulary, runtime injection (if any), persistence (if any), DESIGN.md, dark-mode toggle, globals.css audit + slim, backend appearance route cleanup.

Out: any user-facing rewording of the Settings → Appearance UI shell beyond what the new system requires. The mock UI stays usable; we re-wire it once the new model lands.
