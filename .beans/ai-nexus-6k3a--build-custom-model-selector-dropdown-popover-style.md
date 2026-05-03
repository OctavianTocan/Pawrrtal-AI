---
# ai-nexus-6k3a
title: Build custom model selector dropdown (popover style, grouped by provider)
status: completed
type: feature
priority: high
created_at: 2026-03-12T00:28:54Z
updated_at: 2026-05-02T22:32:29Z
parent: ai-nexus-3i2d
---

## Goal

Build a custom popover-style model selector inspired by Codex, replacing the full dialog selector pattern for chat composition.

## Completed

- [x] Added `ModelSelectorPopover` as a focused feature component for the chat composer.
- [x] Used existing Radix dropdown primitives for keyboard navigation, focus management, outside-click behavior, portal positioning, and upward placement.
- [x] Added local Google and OpenAI-style model options with provider logos, selected checkmarks, and a nested model submenu.
- [x] Added reasoning choices under an Intelligence section.
- [x] Styled the popover with project tokens and `popover-styled` instead of copying Codex colors directly.
- [x] Verified the changed selector files with scoped Biome and `bun run typecheck`.

## Summary of Changes

Implemented the visual-first selector with the repo's dropdown primitives rather than a separate custom hook. This keeps accessibility and positioning aligned with existing UI infrastructure while matching the Codex-like composer behavior requested for this pass.
