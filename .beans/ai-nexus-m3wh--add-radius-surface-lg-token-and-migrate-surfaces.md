---
# ai-nexus-m3wh
title: Add radius-surface-lg token and migrate surfaces
status: completed
type: task
priority: normal
created_at: 2026-05-05T08:43:29Z
updated_at: 2026-05-05T08:44:30Z
---

Introduce DESIGN.md rounded.lg as --radius-surface-lg; use rounded-surface-lg for chat, composer, inputs, onboarding panels.



## Summary of Changes

- `globals.css` `@theme`: `--radius-surface-lg: 14px` (DESIGN.md `rounded.lg`); composer dropdown uses `var(--radius-surface-lg)`.
- Replaced `rounded-[14px]` / misleading `rounded-xl` with `rounded-surface-lg` on chat shell, composer, `Input`/`Textarea`, input-group textarea branch, `Field`, onboarding panels + CTAs (v2 steps, welcome/create/local workspace), dialog close chips.
