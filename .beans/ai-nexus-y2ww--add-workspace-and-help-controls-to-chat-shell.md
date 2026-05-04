---
# ai-nexus-y2ww
title: Add workspace and help controls to chat shell
status: completed
type: task
priority: normal
created_at: 2026-05-02T22:51:17Z
updated_at: 2026-05-02T22:57:52Z
---

## Goal

Add Craft Agents-style top chrome controls and remove distracting composer focus outline.

## Checklist

- [x] Remove selection/focus outline from chat composer surface
- [x] Add top-bar workspace selector UI
- [x] Add top-right help/docs dropdown UI
- [x] Ensure tooltip behavior does not linger after hover leaves by avoiding native title tooltips on menu items
- [x] Verify typecheck and scoped Biome

## Summary of Changes

Added an AI Nexus workspace selector to the top chrome, added a top-right help/docs dropdown with UI-only documentation links, removed the visible composer selection outline, and removed browser-native menu item title tooltips in favor of controlled UI tooltips. Verified with `bun run typecheck` and scoped Biome on `components/app-layout.tsx` and `features/chat/components/ChatComposer.tsx`.
