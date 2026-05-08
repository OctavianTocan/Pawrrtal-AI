---
# pawrrtal-7hip
title: Settings page (Codex-style) with Appearance + Personalization sections
status: completed
type: feature
priority: normal
created_at: 2026-05-04T20:57:52Z
updated_at: 2026-05-04T21:12:22Z
---

Build a full settings page reachable from the NavUser profile dropdown's "Settings" item.

Visuals only this round — knobs do not need to actually mutate state. Goal is a complete visual scaffold that matches the reference screenshots (Codex-style).

## Layout
- Left rail: Back to app / General / Appearance / Configuration / Personalization / MCP servers / Git / Environments / Worktrees / Browser use / Archived chats / Usage
- Right pane: section content scoped to the selected rail item

## Sections to ship visually
- General (basic Profile + Preferences scaffold)
- Appearance (image #11): Theme switcher (Light/Dark/System), themePreview diff card, Light theme + Dark theme cards with Accent / Background / Foreground color rows + UI font / Code font inputs + Translucent sidebar toggle + Contrast slider, Use pointer cursors toggle, UI font size input
- Personalization (image #12): Personality dropdown, Custom instructions textarea + Save, Memory experimental section with Enable memories toggle, Skip tool-assisted chats toggle, Reset memories button

## Wiring
- Settings menu item in NavUser opens /settings (or modal — TBD)
- All controls render but are no-ops; localStorage stub OK for toggles

## Summary of Changes

- New /settings route at frontend/app/settings/page.tsx (outside the (app) group so the chat sidebar isn't drawn).
- New features/settings/ feature with: SettingsLayout (left rail + right pane), constants (section catalog), primitives (Switch / Slider / SettingsRow / SettingsCard built on radix-ui).
- Three sections fully built visually: General (Profile + Preferences + Notifications), Appearance (Theme switcher + diff preview + Light/Dark theme cards with color rows + font inputs + translucent toggle + contrast slider + pointer-cursor toggle + UI font size), Personalization (Personality dropdown + Custom instructions + Memory experimental group).
- Eight remaining sections (Configuration, MCP servers, Git, Environments, Worktrees, Browser use, Archived chats, Usage) render via PlaceholderSection — nav rail entries are clickable but body is a "coming soon" tile.
- NavUser's "Settings" item now navigates to /settings via router.push.

### Wiring (intentionally absent)
- All controls hold local state only; no backend writes, no localStorage persistence.
- Theme controls don't drive the live application theme — when the theming engine ships the wiring lives in features/settings/sections/AppearanceSection.tsx.
