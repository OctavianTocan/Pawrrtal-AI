---
title: Rip out the theming / appearance system
description: ADR — remove the user-customizable theming system; keep a single fixed dark-mode visual identity.
---

# 2026-05-06 — Rip out the theming / appearance system

## Status

Accepted. Frontend rip executes in the same commit as this doc; backend
appearance routes are scheduled to be removed in a follow-up bean.

## Decision

Rip the entire user-customizable theming system. Keep only the Settings
→ Appearance UI shell as a visual mock (controls render, do nothing).
The 6 base color slots in `globals.css` become the only theme — light
by default, with `.dark` class as a static cascade alternate. Per-user
customization is removed; preset switching is removed; runtime CSS
variable injection is removed.

Replacements (semantic surface tokens, canonical consumption pattern,
single derivation formula, etc.) are sketched in this doc but not
implemented here — they're tracked as follow-up beans.

## Snapshot of the system being ripped

Captured in detail because the rebuild should be able to look back at
formulas, naming choices, and architectural seams without spelunking
git history.

### Layer 1 — Public surface (what a user could edit)

Defined in `frontend/features/appearance/types.ts`:

```
COLOR_SLOTS = [background, foreground, accent, info, success, destructive]
FONT_SLOTS  = [display, sans, mono]
OPTIONS     = { theme_mode, translucent_sidebar, contrast,
                pointer_cursors, ui_font_size }
```

Six color slots, three font slots, five options. The whole
user-controllable schema. Everything else was derived.

### Layer 2 — Persistence

`/api/v1/appearance` (FastAPI route in `backend/app/api/`) stored a
nullable `AppearanceSettings { light, dark, fonts, options }` per user.
Each color slot was nullable; `null` = "fall back to default."

### Layer 3 — Defaults

`frontend/features/appearance/defaults.ts` shipped the Mistral-inspired
baseline as a `ResolvedAppearance`. Comment said "must mirror
`globals.css` exactly." No enforcement — convention only.

### Layer 4 — Presets

`frontend/features/appearance/presets.ts` — three bundles (Pawrrtal,
Mistral, Cursor). Each preset was another `{ light, dark, fonts }` set
of the 6 slots. Picking a preset wrote those values into the user's
overrides via the same PUT call. **Presets could not define anything
beyond the 6 slots** — no surface tokens, no shadows, no radii.

### Layer 5 — Resolution

`merge.ts` → `resolveAppearance(partial) → ResolvedAppearance`. Pure
function with `stripNulls` so backend nulls didn't blast defaults.
Tested in `merge.test.ts`.

### Layer 6 — Runtime CSS injection

`AppearanceProvider.tsx` (mounted in `app/providers.tsx`):

- Read resolved settings from TanStack Query (`useAppearance`).
- Picked active mode (`light` / `dark` / system).
- Wrote inline CSS custom properties on `<html>` for **only the 6
  active-mode color slots + the 3 fonts + `--font-size-base`**.
- Toggled `.dark` class on `<html>`.
- Set `data-pointer-cursors`.
- Cleaned up on unmount.

The provider knew about no derivative tokens. Everything else was
left to the cascade.

### Layer 7 — CSS cascade in `globals.css`

The `:root` block (light) and `.dark` block defined every derivative
token, computed from the 6 base slots:

```
:root {
    --background: oklch(0.985 0.026 92);    ← bare slot
    --foreground: oklch(0.21 0.005 285);
    --accent / --info / --success / --destructive
    --background-elevated: oklch(from var(--background) 0.99 calc(c * 0.25) h);
    --background-elevated-shade: oklch(from var(--background-elevated) calc(l - 0.03) c h);
    --foreground-1.5 / -2 / -3 / -5 / -10 / -20 / -30 / -40 / -50 / -60 / -70 / -80 / -90 / -95
    --sidebar: var(--background);
    --card / --popover / --muted / --secondary / --border / --ring / --input
    --shadow-thin / --shadow-minimal / --shadow-middle / --shadow-strong /
        --shadow-modal-small / --shadow-panel-floating / --shadow-panel-focused / --shadow-tinted
    --radius / --radius-surface-lg / --radius-soft / --radius-control / --radius-bubble / --radius-bubble-tail
    --z-base / --z-local / --z-sticky / --z-titlebar / --z-panel /
        --z-dropdown / --z-tooltip / --z-modal / --z-overlay / --z-fullscreen /
        --z-floating-backdrop / --z-floating-menu / --z-island-overlay /
        --z-island / --z-island-popover / --z-splash
    --background-image: <radial+linear gradient stack>
}
```

Because the inner formulas referenced `var(--background)` /
`var(--foreground)` lazily, when `AppearanceProvider` rewrote the 6
base slots, **everything that referenced them recomputed for free**.
That was the elegant part.

The `.dark` block restated everything. **Light and dark formulas were
written independently. Nothing forced them to agree.**

### Layer 8 — Tailwind v4 bridge

`@theme inline { ... }` near the bottom of `globals.css` exposed
selected variables as Tailwind tokens:

```
--color-background: var(--background);
--color-background-elevated: var(--background-elevated);
--color-background-elevated-shade: var(--background-elevated-shade);
--color-foreground / --color-foreground-N (fifteen variants)
--color-sidebar / --color-sidebar-foreground / --color-sidebar-primary / ...
--color-card / --color-popover / --color-muted / --color-border / --color-input / --color-ring
--font-sans / --font-display / --font-mono / --font-serif
--radius-sm / --radius-md / --radius-lg / --radius-xl / --radius-surface-lg / --radius-soft / --radius-control
--z-index-* (matching the --z-* family)
--shadow-2xs / --shadow-xs / --shadow-sm / --shadow / --shadow-md / --shadow-lg / --shadow-xl
```

That's how `bg-background-elevated`, `rounded-surface-lg`, `z-modal`,
etc. became utilities.

### Component consumption — four parallel mechanisms

| Mechanism                     | Example                                        | Where              |
| ----------------------------- | ---------------------------------------------- | ------------------ |
| Tailwind utility from @theme  | `bg-sidebar`, `bg-foreground-5`                | Most components    |
| Tailwind arbitrary value      | `bg-[color:var(--background-elevated)]`        | Chat composer      |
| Inline style                  | `style={{ backgroundColor: 'var(...)' }}`      | ChatView panel     |
| Bespoke CSS class             | `.chat-composer-input-group { ... }`           | One-offs in CSS    |

All four were technically valid. None was documented as canonical. The
chat composer alone used three of them at once at the moment of the
rip.

## Why rip it

1. **The user-controllable surface (6 color slots) is too small to
   drive the surfaces users actually want to customize.** Users
   couldn't directly change "chat panel color" — only `--background`,
   then derivative formulas decided what the chat panel looked like.

2. **Derivative-token formulas drifted between modes.** Dark mode
   shipped with a hardcoded `--background-elevated: oklch(0.239 0.012 264)`
   that didn't track the active background; light mode formulas were
   changed five times on 2026-05-06 alone. There was no shared
   specification, no enforcement that light and dark agree.

3. **Naming was overloaded.** "Background" appeared in
   `--background`, `--background-elevated`, `--background-elevated-shade`,
   `--background-image`, `bg-background` (utility), `--color-background`
   (Tailwind bridge). Six different things, one word.

4. **Component consumption used four parallel mechanisms** (above).
   No canonical pattern.

5. **Adding a new token required three coordinated edits** (`:root`,
   `.dark`, `@theme inline`). Easy to drop one and silently break the
   token's dark-mode behavior or its Tailwind utility.

6. **`DESIGN.md` was lying.** Its documented `--sidebar` derivation
   (`--background-elevated`), elevation hierarchy (background <
   sidebar < card < popover), and 1.5% foreground mix formula no
   longer matched code. Lint passed; doc wasn't authoritative.

7. **One-off CSS classes leaked into `globals.css`.** The
   `chat-composer-input-group` rule existed because the InputGroup
   primitive's API didn't expose enough hooks. That's a smell about
   the primitive, not a real surface token.

## What we keep after the rip

- `frontend/app/globals.css` — the cascade, the tokens, the shadows,
  the radii. Stays as the *only* theme. To be audited and slimmed in
  a follow-up bean.
- The Settings → Appearance UI components (`AppearanceSection.tsx`
  and peers in `frontend/features/settings/sections/`). They become
  self-contained visual mocks: hardcoded labels, local `useState` for
  the preview, no mutations, no API calls, no provider.
- `DESIGN.md` exists, but is queued for rewrite once the rebuild
  settles on a vocabulary.

## What we're ripping

- `frontend/features/appearance/` — entire directory.
- `<AppearanceProvider>` mount in `app/providers.tsx`.
- All component-level imports of `@/features/appearance`.

Backend routes (`/api/v1/appearance`) remain in place after this
commit; they become orphaned. Their removal is tracked as a separate
bean so the API surface can be cleaned up alongside any related test
fixtures.

## Plan for the rebuild

Tracked as beans (filed in the same commit as this doc). Sketch:

1. **Audit `globals.css`.** Catalogue every token, every derivative
   formula, every component-specific override. Decide what stays,
   what becomes part of a rebuilt token system, what gets deleted
   outright.

2. **Define a semantic surface vocabulary.** E.g.
   `--surface-canvas`, `--surface-raised`, `--surface-recessed`,
   `--surface-overlay`. Pick one shared formula per derivation,
   applied identically in light and dark.

3. **Decide whether users can customize derivative surfaces
   directly,** or only the base slots, or not at all. Either is
   fine; the choice has to be explicit and documented before the
   rebuild starts.

4. **Codify "how to add a surface token"** as a single procedure
   that updates all required places at once.

5. **Pick one canonical mechanism for component consumption.**
   Tailwind utility from `@theme` is the leading candidate. Migrate
   inline-style and bespoke-CSS holdouts.

6. **Remove or rewrite the appearance backend** to match whatever
   the rebuilt frontend supports.

7. **Update `DESIGN.md`** so it's authoritative again.
