---
# pawrrtal-nxxo
title: 'Settings layout: align fields, fix vertical rhythm, match reference'
status: completed
type: feature
priority: normal
created_at: 2026-05-04T22:01:45Z
updated_at: 2026-05-04T22:28:13Z
---

Realign the settings page so it matches the Codex/reference layout. Issues today:
- Field labels / values not on same baseline
- Card padding inconsistent
- Section gaps too tight in some places, too wide in others
- Profile section mixes left-aligned label with right-aligned input but spacing reads off
Reference: image #24 (Codex) and image #26 (alt). Current state: image #25.

Done — SettingsRow + SettingsCard tightened (consistent vertical rhythm, baseline alignment), main pane bumped to max-w-3xl with looser padding.
