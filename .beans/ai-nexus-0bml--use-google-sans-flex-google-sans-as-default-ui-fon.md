---
# ai-nexus-0bml
title: Use Google Sans Flex / Google Sans as default UI font stack
status: completed
type: task
priority: normal
created_at: 2026-05-07T02:29:38Z
updated_at: 2026-05-07T02:30:19Z
---

Wire next/font Google_Sans_Flex + Google_Sans; update globals.css --font-sans-stack and DESIGN.md.



## Summary of Changes

- `frontend/app/layout.tsx`: load `Google_Sans_Flex` (variable) + `Google_Sans` (variable) via `next/font/google`; CSS vars `--font-google-sans-flex-loaded`, `--font-google-sans-loaded` on `<html>`.
- `frontend/app/globals.css`: default `--font-sans-stack` = Flex → Google Sans → Helvetica Neue → sans-serif; Inter opt-in chain updated to fall through the same Google faces after Inter.
- `frontend/features/settings/sections/appearance-helpers.ts`: `DEFAULT_FONTS.sans` mirrors the stack.
- `DESIGN.md`: typography tokens + docs updated from system-ui to Google Sans Flex / Google Sans narrative.

Verification: `bun run typecheck` (frontend), `bun run design:lint`, Biome on touched TS files.
