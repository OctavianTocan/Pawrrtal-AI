---
# pawrrtal-ke9j
title: Soften global white and black tokens
status: completed
type: task
priority: normal
created_at: 2026-05-02T23:41:03Z
updated_at: 2026-05-02T23:45:02Z
---

## Goal

Tune global theme endpoints away from pure white and pure black while keeping the current Pawrrtal palette and contrast.

## Checklist

- [x] Inspect current theme token definitions
- [x] Update near-white and near-black global tokens
- [x] Keep contrast and existing semantic surfaces intact
- [x] Verify scoped frontend checks

## Summary of Changes

Softened the global light and dark endpoints in frontend/app/globals.css. Light mode now uses a porcelain off-white background with a deeper neutral ink foreground, while dark mode uses a blue-black background with a warmer soft-white foreground. Updated the matching RGB shadow companions and scenic translucent background to keep derived surfaces consistent. Verified with scoped Biome and diff whitespace checks.
