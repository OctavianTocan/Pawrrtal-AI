---
# ai-nexus-7tr6
title: Load Google Sans via stylesheet (drop next/font warnings)
status: completed
type: bug
priority: normal
created_at: 2026-05-07T21:36:18Z
updated_at: 2026-05-07T21:39:52Z
---

Replace Google_Sans/GS Flex next/font loaders with fonts.googleapis.com links; update DESIGN.md.



## Summary of Changes

- Removed Google Sans / Google Sans Flex from `next/font/google`; load via Google Fonts `<link>` + preconnect in `frontend/app/layout.tsx` (fixes capsize override warnings).
- Fixed split JSDoc before Geist loaders (parse error).
- Aligned `DESIGN.md`, `globals.css` comments, and added `docs/solutions/build-errors/next-font-google-sans-missing-metrics.md`.
