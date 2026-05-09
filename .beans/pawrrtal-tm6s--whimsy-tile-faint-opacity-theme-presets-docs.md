---
# pawrrtal-tm6s
title: 'Whimsy tile: faint opacity + theme presets + docs'
status: completed
type: task
priority: normal
created_at: 2026-05-06T13:31:29Z
updated_at: 2026-05-06T13:35:01Z
---

Tune ChatView texture opacity (lower) and extend whimsy-tile generator with named theme presets (kawaii, cosmic, botanical, geometric, etc.) plus inline documentation showing how to vary the output.

## Summary of Changes

- **Tuned ChatView opacity**: `text-foreground/5` → `text-foreground/[0.035]` (3.5% foreground). Updated comment to point at the new theme presets.
- **Extended whimsy-tile.ts** with theme presets:
  - Switched `KAWAII_MOTIFS` to `as const satisfies readonly Motif[]` so motif IDs become literals.
  - Exported `MotifId` (union of all 10 motif id literals) and `WhimsyThemeName`.
  - Exported `WHIMSY_THEMES` const map: kawaii, cosmic, botanical, geometric, cute, minimal, playful (each typed against MotifId via `satisfies` so misspellings fail at compile time).
  - Added `motifs?: readonly MotifId[]` to `WhimsyTileOptions`. Generator filters `KAWAII_MOTIFS` against the allow-list; falls back to full library if the filter ends up empty so a typo still produces a valid tile.
- **Documented variation in three places**:
  - Big top-of-file docblock in whimsy-tile.ts: explains the three axes (seed / density / motif set), with TS examples for default, theme, and custom-subset usage.
  - Per-export TSDoc on WHIMSY_THEMES, MotifId, and the new `motifs` option.
  - `/dev/whimsy-tile` preview: redesigned into a Theme Presets section (7 cards, one per theme) + Density & Seed Variants section (sparse / default / dense, each over light + dark), plus a 'How to use' pre-formatted code snippet.
- **How many distinct patterns can we generate**: practically unlimited. 7 named themes × any 32-bit seed × 3-10 grid resolutions × any custom motif subset (2^10 - 1 = 1023 non-empty subsets of the 10 motifs). Themes are the qualitative knob; seed is the layout knob; grid is the density knob.
- Gates: `bunx tsc --noEmit` clean, `bunx biome check --write` clean (auto-formatted on write).
