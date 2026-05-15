---
# pawrrtal-hwp3
title: Fix onboarding gates and model loading regressions
status: completed
type: bug
priority: high
created_at: 2026-05-15T06:11:29Z
updated_at: 2026-05-15T06:43:53Z
---

Resolve mandatory backend onboarding being dismissible/reopen behavior, prevent app from rendering chat/listing without backend, and eliminate model selector crashes when model data is delayed/absent.

## Investigation Notes

- Confirmed live backend `/api/v1/models` returns a valid catalog with `vendor` on every row and one default model.
- Fixed frontend catalog state propagation so loading, error, empty catalog, and invalid selection render distinct UI states.
- Fixed `ChatView` passing package-shaped model rows into the local model selector, which expected backend-shaped rows and caused missing `vendor` / misleading `Loading…` behavior.

## Current Fix

- [x] Make model selection fire reliably from submenu rows.
- [x] Keep selected model in immediate React state and persist after validation.
- [x] Cover dotted Gemini model selection and stale placeholder behavior in focused tests.
- [x] Run targeted selector test, typecheck, and Biome on touched files.

## Summary of Changes

- Stabilized model submenu selection by committing model rows on pointer-down with click as the keyboard/fallback path.
- Added immediate selected-model React state in the chat container, with catalog validation before persistence.
- Added focused coverage for selecting the dotted Gemini model ID and updated stale placeholder expectations.
- Verified with the targeted selector test, frontend typecheck, and Biome on touched files.
