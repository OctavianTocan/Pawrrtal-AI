---
# ai-nexus-0za3
title: Polish settings page UI to Codex-style reference
status: completed
type: feature
priority: high
created_at: 2026-05-05T18:18:30Z
updated_at: 2026-05-05T18:32:52Z
---

Apply userinterface-wiki rules + Codex screenshot references to settings primitives, color pills, live theme preview, work-mode card-radio pattern. Bigger headings, better rhythm, tabular-nums on numeric data, text-pretty on descriptions.

## Plan

- [x] Polish primitives — bigger `SettingsPage` heading (text-3xl), `SettingsSectionHeader` title bumped to text-base, tighter rhythm, design-token-only borders/fills
- [x] New `ColorPill` primitive — whole pill is the color, hex floats on top in tabular-nums + a contrasting picker dot. Replaces the swatch + bare hex input pattern
- [~] Move Translucent + Contrast into the per-mode theme cards (Codex parity) — kept in shared Behavior card. Backend stores them as scalar settings, not per-mode; splitting would require a schema change. Slider description rewritten to explain the global behavior
- [~] Live theme preview card — DEFERRED. The whole app IS the live preview (every token writes to <html>), and the ColorPill swatches already preview each color in-place. Adding a separate preview card would duplicate signal. Re-evaluate if users ask for it
- [x] General section — quick theme mode toolbar restyled to match new ThemeModeToggle (bg-background+shadow-sm active state, design-token borders)
- [x] Add `Aa` font preview to preset dropdown rows (rendered in each preset's display font)
- [x] Update `DESIGN.md` with new primitives + color pill spec (settings-page-shell, settings-card, color-pill all documented; settings-section-header updated to text-base)
- [x] Run `tsc --noEmit` + `bun run check` + relevant tests after each edit — 324/324 vitest tests pass, tsc clean, biome 0 errors, design lint 0 errors
- [ ] Commit with conventional message

## Summary of Changes

### Primitives (frontend/features/settings/primitives.tsx)
- **SettingsPage** heading bumped from text-2xl → text-3xl, leading-relaxed body, max-w-60ch on description (matches Codex page-level title rhythm)
- **SettingsSectionHeader** title bumped from text-sm → text-base font-semibold tracking-tight; description text-sm leading-snug
- **SettingsCard** switched from `border-foreground/10 bg-foreground/[0.02]` to theme-aware `border-border/60 bg-card` so it inherits the active palette cleanly under either mode
- **SettingsRow** divider switched to `border-border/40`, label/description column capped at 60% with leading-snug
- **NEW: ColorPill** primitive — entire pill background = the resolved color, hex value floats on top in font-mono tabular-nums with `mix-blend-mode: difference` for auto-contrast on any color. Native picker uncontrolled via ref-driven re-seed (preserves the lurping fix)

### AppearanceSection (frontend/features/settings/sections/)
- Split into 3 files to stay under 500 LOC budget: AppearanceSection.tsx (398 LOC), AppearanceRows.tsx (ColorRow + FontRow), appearance-helpers.ts (toHex, label maps, buildPayload)
- ColorRow now wraps the new ColorPill instead of a 20px swatch + bare hex input
- Preset dropdown rows show an `Aa` glyph rendered in each preset's display font (Newsreader for Mistral, Geist for Cursor) — matches Codex pattern
- Slider description rewritten to actually explain what contrast does

### PersonalizationSection
- Native `<select>` replaced with `SelectButton` (Radix DropdownMenu) — matches the Appearance preset picker chrome and shows each personality's `summary` as a muted sub-line
- Test rewritten to assert on the button role (semantic affordance) instead of the now-removed `<select>` element

### GeneralSection / ArchivedChatsSection / SettingsLayout
- Quick theme mode toolbar restyled to `bg-background + shadow-sm` active state, design-token borders, 150ms transitions
- Archived rows + empty state divider/border switched to design-token colors
- Settings rail: divider uses `border-border/60`, active item uses `bg-foreground/[0.08] font-medium`, 150ms transitions

### DESIGN.md
- Documented `settings-page-shell`, `settings-card`, `color-pill` primitives
- Updated `settings-section-header` spec to match new text-base sizing
- Component count: 14 → 16

### Verification
- biome check: 0 errors, 1 expected cognitive-complexity warning on multi-section panel
- tsc --noEmit: 0 errors
- vitest run: 324/324 tests pass (76 files)
- bun run design:lint: 0 errors
- Live in Chrome: H1 = 30px ✅, section titles = 16px ✅, 12 ColorPills rendering with correct backgrounds + tabular-nums hex + mix-blend-difference ✅

## Deferred
- Live theme preview card — the whole app IS the preview; ColorPills preview each token in-place
- Per-mode contrast slider — backend schema stores contrast as a single scalar; would need a migration to split per-mode
