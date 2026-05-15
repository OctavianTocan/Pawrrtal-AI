---
# pawrrtal-3ikz
title: Fix reasoning effort selector reliability
status: completed
type: bug
priority: high
created_at: 2026-05-15T06:45:04Z
updated_at: 2026-05-15T06:46:09Z
---

Reasoning effort submenu sometimes closes without applying the selected level. Stabilize it with the same interaction/state pattern used for model selection.

- [x] Commit reasoning rows on pointer-down with click fallback.
- [x] Keep reasoning selection in immediate React state and persist after validation.
- [x] Add focused coverage for reasoning submenu selection.
- [x] Run scoped checks requested by this fix.

## Summary of Changes

- Stabilized reasoning submenu selection by committing rows on pointer-down with click as the keyboard/fallback path.
- Added immediate selected-reasoning React state in the chat container, with validation before persistence.
- Added focused coverage for selecting a reasoning level from the Thinking submenu.
- Verified with the targeted selector test, frontend typecheck, and Biome on touched files.
