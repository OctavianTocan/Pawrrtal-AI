---
# pawrrtal-3elw
title: Audit and slim globals.css
status: todo
type: task
priority: high
created_at: 2026-05-06T12:53:50Z
updated_at: 2026-05-06T12:53:50Z
parent: pawrrtal-9kov
---

Catalogue every token, derivative formula, and component-specific override in `frontend/app/globals.css` (1536 lines, ~269 token declarations, ~79 selector blocks at the time of the rip). Decide which stay, which get folded into the rebuilt surface vocabulary, and which delete outright.

## Inventory hooks

- `@property` registrations (lines 13-52): six base color slots typed as `<color>`. Stay.
- `:root` block (~lines 73-273): 6 base colors, mix variants `--foreground-1.5`/-2/-3/-5/-10/-20/-30/-40/-50/-60/-70/-80/-90/-95, derivative surfaces (`--background-elevated`, `--background-elevated-shade`, `--sidebar`, `--card`, `--popover`, `--muted`, `--secondary`, `--border`, `--ring`, `--input`), shadow stack, radius family, z-index ladder, font stacks, scenic gradient. Triage everything.
- `.dark` block (~lines 291-422): mirrors `:root` token-by-token, often with hand-rolled formulas that drifted. Triage everything.
- Scenic mode rules (lines 449-486): `html[data-scenic]::before`, etc. Decide keep/scrap.
- Theme-override / theme-mismatch rules (lines 424-442). Decide keep/scrap.
- `@theme inline` block (lines 493-611): Tailwind v4 bridge. Will need to mirror whatever the rebuild settles on.
- `@layer base` rules (~lines 612-680): focus-visible, scrollbar, body, etc. Mostly keep, audit anyway.
- `@layer utilities` (~lines 682-870): scrollbar-hide, scrollbar-hover, mask-fade, .panel-scroll, etc. Some are real utilities, some are one-offs.
- `@layer components` (~lines 988-end): bespoke component-scoped rules (`.session-item`, `.chat-composer-input-group`, `.chat-composer-dropdown-menu`, `.popover-styled`, etc.). Many of these should go away when the surface vocabulary lands.
- 11 `@keyframes` blocks (`spinner-grid`, `toast-in`, `waveform-scroll`, `shimmer`, etc.). Audit usage.
- Spinner CSS (`.spinner`, `.spinner-cube`, etc.). Audit usage.

## Deliverable

A `docs/architecture/globals-css-audit-2026-05-XX.md` that lists every token + selector with one of three labels: `keep`, `fold-into-surface-system`, `delete`. Plus the rationale per row.

## TODO
- [ ] Inventory tokens
- [ ] Inventory selectors
- [ ] Categorise (keep/fold/delete)
- [ ] Write audit doc
- [ ] Open follow-up beans for actual deletion / migration based on audit findings
