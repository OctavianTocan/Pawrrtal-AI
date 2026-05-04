---
version: alpha
name: AI Nexus
description: >
  Craft Agents-inspired chat interface with a flat, editorial aesthetic. Six
  semantic colors, neutral interpolation variants, and a 16px-rooted Tailwind v4
  scale. Dual-theme (light + dark, Codex/GitHub-adjacent in dark).
colors:
  primary: "#684E85"
  background: "#F7F4ED"
  foreground: "#1D1D24"
  accent: "#684E85"
  info: "#B47828"
  success: "#22783C"
  destructive: "#B43C32"
  border: "#E8E5DE"
  muted-foreground: "#8A8888"
  user-message-bubble: "#ECE9E3"
  info-text: "#684A26"
  success-text: "#1F4A30"
  destructive-text: "#682C2B"
typography:
  display:
    fontFamily: system-ui
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  h1:
    fontFamily: system-ui
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.015em
  h2:
    fontFamily: system-ui
    fontSize: 1.875rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  h3:
    fontFamily: system-ui
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
  h4:
    fontFamily: system-ui
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: system-ui
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: system-ui
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: system-ui
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: system-ui
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  code:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 14px
  bubble: 20px
  bubble-tail: 4px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  popover:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  chat-composer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 12px
  bubble-user:
    backgroundColor: "{colors.user-message-bubble}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.bubble}"
    padding: 12px
  bubble-assistant:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    padding: 12px
  step-icon:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    size: 64px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.none}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: 12px
  badge-info:
    backgroundColor: "{colors.background}"
    textColor: "{colors.info-text}"
    rounded: "{rounded.sm}"
    padding: 4px
  badge-success:
    backgroundColor: "{colors.background}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.sm}"
    padding: 4px
  badge-destructive:
    backgroundColor: "{colors.background}"
    textColor: "{colors.destructive-text}"
    rounded: "{rounded.sm}"
    padding: 4px
  status-dot-info:
    backgroundColor: "{colors.info}"
    rounded: "{rounded.full}"
    size: 8px
  status-dot-success:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.full}"
    size: 8px
  status-dot-destructive:
    backgroundColor: "{colors.destructive}"
    rounded: "{rounded.full}"
    size: 8px
  button-link:
    textColor: "{colors.accent}"
    typography: body-md
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  metadata:
    textColor: "{colors.muted-foreground}"
    typography: caption
---

## Overview

AI Nexus is a chat-first AI workspace with a **Craft Agents-inspired** visual
language: warm, flat, and editorial. Surfaces are matte (no gradients on UI
chrome by default); hierarchy comes from typography, neutral interpolation,
and a single brand accent.

The system is dual-theme. Light mode is a warm, low-chroma palette with a
subdued purple accent; dark mode is **Codex/GitHub-adjacent** (`#0D1117`
canvas, `#388BFD` accent) so the product reads as a developer-native AI
surface in dark.

The token names in the front matter document the **light theme** (the `:root`
default in `frontend/app/globals.css`). Dark theme is documented inline in
each section.

## Colors

The palette is six semantic roles plus neutral interpolation. Canonical values
in code are `oklch()` triples; the front matter records the sRGB hex
approximations the linter expects.

- **Background** — page surface. Warm off-white in light, near-black in dark.
- **Foreground** — text and icons. Deep ink in light, soft white in dark.
- **Accent** — interaction and brand. Subdued purple in light, GitHub-blue in dark.
- **Info** — amber. "Ask" mode, warnings, neutral notifications.
- **Success** — green. Connected states, checkmarks, positive confirmations.
- **Destructive** — red. Errors, failed states, dangerous actions.

### Neutral Interpolation (Mix Variants)

The system avoids defining gray steps. Instead, `--foreground-N` solid mixes
toward the background give us a continuous tonal scale that auto-inverts
between light and dark themes. Tailwind exposes these as
`bg-foreground-5`, `bg-foreground-10`, … `bg-foreground-95`.

Common roles:

- `foreground-5` — hover states, sidebar accent surfaces, subtle borders.
- `foreground-10` — input affordances, dividers.
- `foreground-50` — muted body text, secondary copy.
- `foreground-80` — dimmed-but-still-readable text.

Alpha variants (`bg-foreground/10`, `text-accent/60`, etc.) are also valid;
prefer the solid `-N` mixes for surface fills and the `/N` alpha for borders
or overlays where the layer underneath should bleed through.

### Light Mode Anchors

| Role        | Hex (approx) | Canonical                    |
| ----------- | ------------ | ---------------------------- |
| background  | `#F7F4ED`    | `oklch(0.972 0.006 85)`      |
| foreground  | `#1D1D24`    | `oklch(0.165 0.012 265)`     |
| accent      | `#684E85`    | `oklch(0.62 0.13 293)`       |
| info        | `#B47828`    | `oklch(0.75 0.16 70)`        |
| success     | `#22783C`    | `oklch(0.55 0.17 145)`       |
| destructive | `#B43C32`    | `oklch(0.58 0.24 28)`        |

### Dark Mode Anchors

Dark mode is Codex/GitHub-adjacent. These hex values are the **explicit
anchors** referenced in `globals.css`:

| Role               | Hex       | Note                          |
| ------------------ | --------- | ----------------------------- |
| background         | `#0D1117` | Page / workspace canvas       |
| background-elevated| `#161B22` | Sidebar, elevated surfaces    |
| foreground         | `#E6EDF3` | Primary text                  |
| accent             | `#388BFD` | Interactive blue              |
| border             | `#30363D` | Hairline dividers             |
| muted-foreground   | `#8B949E` | Secondary / metadata copy     |

## Typography

The default font is **system-ui** (the platform sans), with **Inter** as an
opt-in via `<html data-font="inter">`. When Inter is active, OpenType
features `cv01`–`cv04` and `case` are enabled for slightly more
geometric letterforms.

Monospace is **JetBrains Mono** for code, terminals, and serif slots
(the system aliases serif → mono on purpose; this is a chat surface,
not a long-form reading surface).

The root font size is **16px** — `<html>` reads `--font-size-base`, so every
`rem`-denominated value scales off 16. Tailwind v4 utilities (`text-xs`,
`text-sm`, `text-base`, …) map to the standard rem values and resolve to
clean pixel sizes (12, 14, 16, 18, 20, 24, 30, 36, 48, …).

### Scale

| Token     | Size      | px @ 16 base | Common use                        |
| --------- | --------- | ------------ | --------------------------------- |
| display   | 3rem      | 48px         | Hero headings, marketing splash   |
| h1        | 2.25rem   | 36px         | Page titles                       |
| h2        | 1.875rem  | 30px         | Section heads                     |
| h3        | 1.5rem    | 24px         | Subsection / onboarding step      |
| h4        | 1.25rem   | 20px         | Card titles                       |
| body-lg   | 1.125rem  | 18px         | Lead paragraph, prominent body    |
| body-md   | 1rem      | 16px         | Default body, chat messages       |
| body-sm   | 0.875rem  | 14px         | Secondary body, metadata          |
| caption   | 0.75rem   | 12px         | Labels, badges, dense UI          |
| code      | 0.875rem  | 14px         | Inline code, pre blocks           |

Headings use **negative letter-spacing** (`-0.01em` to `-0.02em`) to compensate
for system-ui's default tracking. Body uses default tracking. Caption uses
slightly **positive tracking** (`+0.01em`) for legibility at small sizes.

## Layout

Spacing follows Tailwind v4's `--spacing: 0.25rem` (= 4px) base. Prefer the
named scale below over arbitrary px values; they map 1:1 to Tailwind utilities
(`p-1`, `p-2`, `p-4`, `p-6`, `p-8`, `p-12`).

| Token  | Value | Tailwind | Use                                          |
| ------ | ----- | -------- | -------------------------------------------- |
| xs     | 4px   | `*-1`    | Hairline gaps, icon-text padding             |
| sm     | 8px   | `*-2`    | Tight inline spacing, icon button padding    |
| md     | 16px  | `*-4`    | Default block spacing, card padding          |
| lg     | 24px  | `*-6`    | Section spacing, modal padding               |
| xl     | 32px  | `*-8`    | Top-of-page rhythm, large card gaps          |
| 2xl    | 48px  | `*-12`   | Hero spacing, full-page sectioning           |

### Z-index Scale

A semantic z-index ladder is exposed as CSS variables (`--z-base` through
`--z-splash`). Always reference these tokens; never hard-code z-index values.

| Token             | Value | Use                              |
| ----------------- | ----- | -------------------------------- |
| base              | 0     | Default flow                     |
| local             | 10    | In-component layering            |
| sticky            | 20    | Sticky headers                   |
| titlebar          | 40    | App title bar                    |
| panel             | 50    | Side panels                      |
| dropdown          | 100   | Menus, comboboxes                |
| tooltip           | 150   | Tooltips                         |
| modal             | 200   | Modal dialogs                    |
| overlay           | 300   | Full-page overlays               |
| floating-menu     | 400   | Floating action menus            |
| splash            | 600   | Splash / loading takeover        |

## Elevation & Depth

Shadows are **token-based**, not free-form. The opacity of every shadow scales
with two CSS variables (`--shadow-border-opacity`, `--shadow-blur-opacity`)
that are tuned per theme: subtle in light, stronger in dark.

| Token                  | Use                                                       |
| ---------------------- | --------------------------------------------------------- |
| `shadow-thin`          | Hairline border, no blur. Buttons, input groups.          |
| `shadow-minimal`       | 1px border + light blur. Cards, popovers.                 |
| `shadow-middle`        | Stacked blurs. Modals, important panels.                  |
| `shadow-strong`        | Deep stacked blurs. Dialogs over scrim.                   |
| `shadow-modal-small`   | Modal-style shadow with multiple radii.                   |
| `shadow-panel-floating`| Panels stacked over other panels (chat over sidebar).     |
| `shadow-panel-focused` | Adds a 1px gradient inner border for the focused panel.   |
| `shadow-tinted`        | Tinted variant; pass `--shadow-color` as `r, g, b`.       |

In **scenic mode** (`html[data-scenic]`), `shadow-middle` and `shadow-strong`
gain a `backdrop-filter: blur(8px)` and a 1px gradient inner border, turning
solid panels into glass.

## Shapes

The system is **flat by default**: `--radius` is `0` and Tailwind's
`rounded-{sm,md,lg,xl}` utilities all resolve to 0. Use the `rounded` scale
above (`sm: 4px`, `md: 8px`, `lg: 14px`) **explicitly** when a component needs
softening — popovers, chat composer surfaces, dropdown menus.

### The Bubble Exception

Chat message bubbles use an **asymmetric "tail" radius** so the bubble
visually attaches to its author edge:

- `--radius-bubble: 1.25rem` (20px) — three rounded corners.
- `--radius-bubble-tail: 0.25rem` (4px) — the corner adjacent to the author.

User messages tail toward the right; assistant messages tail toward the left.
This is the only place in the system that breaks the flat default.

## Components

Component tokens record the **typed surfaces** in the chat workspace. Use the
front matter as the source of truth for backgrounds, text colors, and radii;
fall back to the prose below for behavioral notes.

- **`popover`** — Used by all menu containers via the `popover-styled`
  utility class. 8px radius (`rounded.md`), `shadow-modal-small`, no border.
  In scenic mode, gains a 24px backdrop blur.
- **`chat-composer`** — The message input surface. Soft (`shadow-minimal`),
  no border on focus (the shadow alone defines the edge). Dropdowns opened
  from the composer (e.g. model picker) inherit `chat-composer-dropdown-menu`
  styling — 14px radius (`rounded.lg`), `--foreground-5` background.
- **`bubble-user`** — User message bubbles use `--user-message-bubble` (a
  tinted-foreground alpha) with the asymmetric tail described in **Shapes**.
- **`bubble-assistant`** — Assistant messages have **no bubble** by default.
  They sit on the page background with the foreground color, with prose
  styling for long-form output.
- **`step-icon`** — Onboarding step iconography. 64px square, 16px radius,
  inverse fill (foreground on background-inverse). Inner glyph is 32px.
- **`button-primary`** / **`button-secondary`** — Buttons follow the flat
  default (`rounded.none`). Primary fills with accent; secondary inherits
  the page background and relies on `shadow-thin` for definition.

## Do's and Don'ts

### Do

- **Use semantic tokens.** Reach for `text-foreground`, `bg-background`,
  `text-accent`, `bg-foreground-5` before any literal color.
- **Use the `--foreground-N` scale** for tonal grays. It auto-inverts and
  preserves the warm/cool tint of the theme.
- **Keep surfaces flat by default.** If you find yourself adding a radius,
  ask whether it's a popover, composer, or chat bubble — those are the only
  shapes with curvature in this system.
- **Reach for `shadow-minimal` first.** Most surfaces need only a hairline.
  Save `shadow-middle` and `shadow-strong` for true elevation (modals,
  floating panels).
- **Reference z-index tokens** (`z-modal`, `z-tooltip`) — never hard-code.
- **Trust the 16px root.** All Tailwind sizing utilities resolve to clean
  pixels; you should rarely need a literal `px` value outside 1px borders
  and a handful of icon-sized affordances.

### Don't

- **Don't introduce gradients on UI chrome.** The matte aesthetic is
  load-bearing. Background image gradients on the page itself are fine and
  intentional (`--background-image`).
- **Don't add new `--radius-*` tokens.** Use the existing scale or use 0.
- **Don't use `text-gray-*` or any literal Tailwind color utility.** They
  bypass the theme system and won't invert in dark mode.
- **Don't hard-code shadow stacks.** Reach for the named shadow utilities;
  if none fit, add a new named token rather than inlining `box-shadow`.
- **Don't introduce a new font family** without an opt-in `data-*` toggle
  on `<html>`, mirroring how `data-font="inter"` is wired.
- **Don't use the bubble radius outside chat messages.** It's the system's
  one asymmetric shape and exists to anchor bubbles to their author.

---

## Validating This File

This file follows the [DESIGN.md spec](https://github.com/google-labs-code/design.md).

```bash
npx @google/design.md lint DESIGN.md
npx @google/design.md diff DESIGN.md DESIGN-v2.md
npx @google/design.md export --format css-tailwind DESIGN.md > theme.css
```

The canonical token values live in `frontend/app/globals.css`. When tokens
change there, mirror them here in the same PR.
