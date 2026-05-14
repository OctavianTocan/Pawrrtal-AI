---
title: Tailwind v4 preset + chat-* token theme for react-chat-composer
description: ADR — use a Tailwind v4 preset with chat-* CSS tokens to style the extracted react-chat-composer package.
---

# ADR: Tailwind v4 preset + `chat-*` token theme for `@octavian-tocan/react-chat-composer`

- **Date:** 2026-05-10
- **Status:** Accepted
- **Owners:** OctavianTocan
- **Tracking:** `docs/plans/extract-react-chat-composer.md`

## Context

We're extracting the pawrrtal chat composer surface (4 files —
`ChatComposer`, `ChatComposerControls`, `ModelSelectorPopover`,
`ChatPromptSuggestions`) into a self-contained, npm-publishable React
package: `@octavian-tocan/react-chat-composer`. The package follows the
same precedent as the existing `@octavian-tocan/react-overlay` and
`@octavian-tocan/react-dropdown` submodules under `frontend/lib/`.

The composer leans heavily on the host repo's design tokens via Tailwind
classes — `text-muted-foreground`, `bg-foreground/[0.04]`, `border-border/50`,
`shadow-minimal`, `rounded-surface-lg`, semantic colors (`text-info`,
`text-warning`, `text-destructive`, `text-accent`, `bg-accent`), plus custom
keyframes (`composer-placeholder-enter`, `waveform-scroll`). It uses ~15+
distinct tokens. A fresh React/Next.js project picking the package off npm
needs to either (a) have all those tokens defined in its Tailwind config or
(b) get them shipped by the package itself.

The packages that already exist (`react-overlay`, `react-dropdown`) take
the (a) route: they ship raw Tailwind classes that reference shadcn-style
tokens, and they assume the consumer has Tailwind v4 + the matching token
vocabulary set up. That works because they reference a small number of
generic tokens (`muted-foreground`, `foreground`, `accent`). The composer
references too many to be safely assumed.

## Decision

`@octavian-tocan/react-chat-composer` ships styles as a **Tailwind v4
preset + a package-namespaced token theme**. Specifically:

1. **Token namespace.** Every token the composer needs is namespaced
   `chat-*` (e.g. `--color-chat-bg-elevated`, `--color-chat-muted`,
   `--color-chat-accent`, `--radius-chat-lg`, `--shadow-chat-minimal`,
   `--animate-chat-placeholder`). Namespacing prevents collisions with
   whatever token vocabulary the consumer's own design system uses.
2. **Light + dark defaults shipped.** The package's `dist/styles/theme.css`
   contains a Tailwind v4 `@theme` block with sensible light-mode and
   dark-mode defaults for every `--color-chat-*`. Consumer integration is
   one `@import` line + `@source` directive in their `globals.css`. Zero
   additional config required for the out-of-the-box look.
3. **Component code references the namespaced tokens via Tailwind classes**
   (`bg-chat-bg-elevated`, `text-chat-muted`, `rounded-chat-lg`). Tailwind
   compiles these against the `@theme` block the consumer imported.
4. **Theming = override CSS variables.** Consumers who want to recolor the
   composer override one or more `--color-chat-*` variables in their own
   CSS. No fork, no plugin config, no JS theme provider.
5. **Non-Tailwind animations** (`composer-placeholder-enter`, the
   `waveform-scroll` keyframes used by `VoiceMeter`) ship as a separate
   `dist/styles/animations.css` the consumer imports. They're not
   expressible as `@theme` tokens, so they sit beside it.
6. **Tailwind v4 only.** No v3 compat plugin. The host stack is v4; any
   future consumer projects are expected to be v4 too.

## Consequences

**Wins**

- Consumers theme by overriding CSS variables — no Tailwind config edits,
  no plugin registrations, no JS providers. One-line recolor.
- Zero duplicate CSS shipped: classes are compiled by the consumer's
  Tailwind, the package only ships compiled JS + a tiny `theme.css` +
  `animations.css`.
- Token namespacing (`chat-*` instead of `foreground`/`background`) means
  the package can't accidentally fight the consumer's own design system.
- Precedent consistency: `react-overlay` and `react-dropdown` also depend
  on the consumer running Tailwind v4. Keeping `react-chat-composer` on
  the same model means contributors moving between submodules don't have
  to re-learn the build/CSS story per package.
- The composer's lighter surface (themable via CSS variables) is the same
  pattern Mantine, Radix Themes, and Cobalt UI ship with — well-understood
  in the React UI ecosystem.

**Trade-offs**

- **Precondition: consumer must have Tailwind v4 set up.** A fresh React
  project without Tailwind can't use the package. This is an explicit
  scoping choice — the package targets the same stack the host repo runs.
  It is documented prominently in the package README.
- **`@source` directive needed in consumer's globals.css.** Without it the
  Tailwind compiler doesn't see the classes the package's JS references,
  so the build emits no styles for them. One extra line of setup. This
  matches how `react-overlay` and `react-dropdown` are already integrated
  in pawrrtal (see `frontend/app/globals.css`'s existing
  `@source "../lib/react-overlay/src";` lines).
- Token override surface is wide (one variable per semantic concept). A
  consumer who wants to retheme top-to-bottom overrides ~15 variables. This
  is the standard cost of a themable component library; documented in the
  README's "theming" section with copy-pasteable token-override snippets.

## Alternatives considered

1. **Ship raw Tailwind classes referencing shadcn-style tokens** (`react-overlay`/
   `react-dropdown` precedent). Smallest bundle, perfect precedent parity. But
   the composer references too many tokens to safely assume a fresh consumer has
   them all wired — `--background-elevated`, `--radius-surface-lg`,
   `--shadow-minimal`, eight semantic colors, etc. A consumer without those
   tokens defined gets a broken UI on day one. Worse, the existing precedent
   packages can get away with it because they reference 2–3 generic tokens;
   scaling that to 15+ pushes the precondition past reasonable.
2. **Compiled CSS bundle, no Tailwind required.** Convert all Tailwind classes to
   vanilla CSS at build time, ship a single `styles/composer.css` file the
   consumer imports. Works in ANY React project. But: bigger bundle (CSS
   duplication with the consumer's Tailwind output), diverges hard from the
   precedent (overlay/dropdown both rely on consumer Tailwind), and the theming
   story becomes worse (consumers can't selectively override individual classes
   without specificity wars). Rejected primarily for precedent inconsistency —
   maintaining two style models across our submodules is friction we don't need.
3. **JS Tailwind plugin the consumer registers in `tailwind.config.ts`.**
   Idiomatic for Tailwind v3 but obsolete for v4 (v4 is CSS-first; JS configs
   exist for migration only). Rejected as already-obsolete tooling at the time
   of writing.
4. **No tokens, opinionated single-look CSS.** Ship one fixed visual style with
   no theme variables. Easiest to maintain, lowest API surface. But makes the
   package unusable in projects with a different design system, contradicting
   the entire reason to extract this package — "I want to reuse this composer
   in multiple projects."

## References

- `docs/plans/extract-react-chat-composer.md` — full implementation plan.
- `frontend/app/globals.css` — host's existing `@source` + `@theme` pattern
  used by the precedent packages.
- `frontend/lib/react-overlay/AGENTS.md` — precedent style story.
- `frontend/lib/react-dropdown/package.json` — precedent exports + `sideEffects`
  layout.
