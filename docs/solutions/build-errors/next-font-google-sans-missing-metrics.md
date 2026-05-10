---
title: Next.js “Failed to find font override values” for Google Sans / Google Sans Flex
category: build-errors
tags: [next.js, next/font, google-fonts, typography, dev-server]
symptoms:
  - Dev console warns Failed to find font override values for font `Google Sans` or `Google Sans Flex`
  - Skipping generating a fallback font
root_cause: >
  next/font/google computes capsize-style fallback metrics per family; Google Sans
  and Google Sans Flex are not in that metrics database, so Next logs warnings
  even when adjustFontFallback is false on some versions.
---

## Problem

Local `next dev` spams warnings about missing font override values for **Google Sans** or **Google Sans Flex**.

## Solution

Do **not** load those families through `next/font/google`. Load them with the **public Google Fonts CSS** (stylesheet `<link>` to `fonts.googleapis.com/css2?...`) and `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com`. Keep using `next/font/google` only for families Next supports well (e.g. Geist, Newsreader).

Align `frontend/app/globals.css` `--font-sans-stack` with the same family names as the stylesheet.

## Prevention

When changing the default UI sans stack, update `frontend/app/layout.tsx` (link), `frontend/app/globals.css`, `DESIGN.md`, and `frontend/features/settings/sections/appearance-helpers.ts` in the same change.

## References

- Fix applied in `frontend/app/layout.tsx` (Google Fonts link for Google Sans / Google Sans Flex).
