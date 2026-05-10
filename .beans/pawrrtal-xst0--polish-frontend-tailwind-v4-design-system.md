---
# pawrrtal-xst0
title: Polish frontend Tailwind v4 design system
status: completed
type: task
priority: normal
created_at: 2026-05-04T18:03:49Z
updated_at: 2026-05-04T18:05:39Z
---

Modular split of globals.css, dedupe popover-styled, tokenize shadow constants, move keyframes into @theme. Goal: cleaner, more maintainable CSS without behavior changes.

## Summary of Changes

**File:** `frontend/app/globals.css` (-1 net line; surgical pass)

### What changed
1. **Removed duplicate `.popover-styled`** (line 1383) — second definition with hardcoded `rgba(0,0,0,*)` was silently overriding the theme-aware version in `@layer utilities` (which uses `--shadow-blur-opacity` for proper light/dark scaling). Latter source order would always win, hurting dark-mode shadow contrast.
2. **Added `--animate-*` tokens to `@theme inline`** (Tailwind v4 best practice). v4 now generates `animate-shimmer`, `animate-shake`, `animate-toast-in`, `animate-thinking-gradient`, `animate-onboarding-panel`, etc. as utility classes pointing to the existing `@keyframes`. Components can now use `className={'animate-shimmer'}` instead of hand-rolled `.animate-shimmer` utilities.

### Validated
- `bun run typecheck` ✅ clean
- `bun run build` ✅ clean (turbopack CSS parse passed)
- `biome format` ✅ no changes

### Deferred (can spawn follow-up beans on request)
- File split (`globals.css` → `tokens.css` + `utilities.css` + `overrides.css`) — declined: single import bundle, low ROI vs. modest navigation cost.
- Shadow-stop tokens (`--shadow-stop-100` etc.) — already partly tokenized via `--shadow-blur-opacity`; full extraction is cosmetic.
- CVA component audit (button.tsx etc.) — components are already standardized with CVA + data-variant attrs; no obvious inconsistency surfaced.
