---
# ai-nexus-j1mk
title: Whimsy customization in Appearance settings
status: completed
type: task
priority: normal
created_at: 2026-05-06T13:39:30Z
updated_at: 2026-05-06T13:41:54Z
---

Single self-contained file at frontend/features/whimsy/index.tsx exposing useWhimsyConfig, useWhimsyTile, and a WhimsySettingsCard. Persisted via existing usePersistedState hook. Wired into ChatView (replaces module-scope constants) and AppearanceSection (one new card).

## Summary of Changes

- **Added** `frontend/features/whimsy/index.tsx` (single self-contained file, ~270 LOC):
  - `WhimsyConfig` type with fields: enabled, theme, seed, grid, size, opacity.
  - localStorage persistence under key `whimsy:config` via the existing `usePersistedState` hook (no new providers, no new query layers, no new contexts).
  - Strict on-disk validator so out-of-bounds values silently fall back to the default.
  - `useWhimsyConfig()` hook returning `[config, setConfig]`.
  - `useWhimsyTile()` hook returning `{ cssUrl, size, opacity }` — memoized SVG generation; `cssUrl` is null when disabled so consumers can early-return.
  - `<WhimsySettingsCard />` with: enable toggle, theme dropdown (7 presets via SelectButton), seed input + 🎲 randomize button, density slider (3-10), tile size slider (120-360px), opacity slider (0-20%), and a Reset button.
- **Edited** `frontend/features/chat/ChatView.tsx`:
  - Removed module-scope `WHIMSY_TILE_SIZE` and `WHIMSY_TILE_URL` constants and the now-unused `whimsy-tile` imports.
  - Calls `useWhimsyTile()` once in the body; renders the overlay div conditionally on `whimsy.cssUrl`. Opacity is applied via CSS `opacity` instead of a Tailwind opacity utility so it can be a runtime value.
- **Edited** `frontend/features/settings/sections/AppearanceSection.tsx`:
  - Imported `WhimsySettingsCard` and rendered it once at the bottom of the section, with a comment noting it is the only live (non-mock) control on this page.
- Live cross-tab sync comes for free via the underlying `usePersistedState` (storage events). Slider changes update the chat panel without a refresh.
- **Removal recipe** (mirrors the doc block in the new file): delete `frontend/features/whimsy/`, revert the two import/usage edits in ChatView and AppearanceSection. Optionally also delete `frontend/lib/whimsy-tile.ts` and `frontend/app/dev/whimsy-tile/`.
- Gates: `bunx tsc --noEmit` clean, `bunx biome check --write` clean (auto-formatted on write).
