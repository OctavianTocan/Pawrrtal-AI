---
# pawrrtal-xlq5
title: Swap sidebar trigger icon by state
status: completed
type: task
priority: normal
created_at: 2026-05-03T10:06:06Z
updated_at: 2026-05-03T10:11:41Z
---

Update the top bar sidebar trigger to show a different icon depending on whether pressing it will open or close the sidebar.\n\n- [x] Inspect sidebar trigger state and icon imports\n- [x] Replace static icon with state-aware icons\n- [x] Verify touched file

## Summary of Changes\n\n- Replaced the static Tabler sidebar icon with Hugeicons PanelLeftOpenIcon and PanelLeftCloseIcon.\n- The trigger now derives whether the next click opens or closes the sidebar from desktop state or mobile open state.\n- Verified with TypeScript and git diff whitespace checks. Biome intentionally ignores frontend/components/ui/** in this repo config.
