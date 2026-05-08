---
# pawrrtal-kgcw
title: Add UserSettings model
status: completed
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:33Z
updated_at: 2026-03-07T22:02:05Z
parent: pawrrtal-9ygz
---

Add UserSettings table: custom_instructions (text, nullable — user's global system prompt), accent_color, font_size. FK to user with CASCADE delete. Keep it minimal — add more fields when we actually need them.

## Summary of Changes

- Added UserPreferences model in models.py with user_id as PK (no separate id — 1:1 with User)
- Fields: custom_instructions (Text, nullable), accent_color (String(7), nullable), font_size (int)
- FK to user.id with CASCADE delete
