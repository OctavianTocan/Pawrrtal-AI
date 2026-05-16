---
# pawrrtal-ebh4
title: Wire Telegram verbose rendering and startup command refresh
status: completed
type: task
priority: normal
created_at: 2026-05-16T19:06:27Z
updated_at: 2026-05-16T19:12:58Z
---

Implement Telegram command-menu refresh on backend startup, fully wire Telegram verbose levels into stream delivery, and explain default vs non-default workspace behavior after tracing fresh onboarding.

## Summary of Changes\n\n- Registered the Telegram slash-command menu on bot startup from one command registry.\n- Wired Telegram verbose levels into the shared turn runner so quiet drops tools/thinking, normal shows tool activity, and detailed allows thinking events through.\n- Rendered thinking chunks in Telegram when detailed verbosity is enabled.\n- Cleaned up orphan workspace directories left by losing concurrent default-workspace inserts.\n- Added focused regression coverage and verified the touched backend paths.
