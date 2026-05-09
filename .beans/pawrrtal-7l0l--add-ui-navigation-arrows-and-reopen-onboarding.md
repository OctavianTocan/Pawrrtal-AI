---
# pawrrtal-7l0l
title: Add UI navigation arrows and reopen onboarding
status: completed
type: task
priority: normal
created_at: 2026-05-03T00:04:35Z
updated_at: 2026-05-03T00:15:52Z
---

Add UI-only back/forward arrows beside the sidebar toggle, shift workspace controls, make Add Workspace reopen onboarding, and tune dark app surface color.

## Summary of Changes

Added UI-only back/forward arrow buttons directly after the sidebar toggle and shifted the workspace selector to the right of them. Wired the Add Workspace dropdown item to dispatch an onboarding reopen event, added an app-layout onboarding host so it works across app routes, and kept the root page initial onboarding behavior separate. Tuned the dark app background/sidebar tokens and onboarding dark surfaces toward the cooler dark reference. Verified with scoped Biome, full typecheck, git diff whitespace check, and production build.
