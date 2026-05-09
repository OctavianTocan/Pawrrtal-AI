---
# pawrrtal-mml1
title: Fix model selector visual bugs
status: scrapped
type: bug
priority: high
created_at: 2026-03-10T19:08:42Z
updated_at: 2026-03-10T19:14:50Z
---

The model selector has multiple visual issues:

1. **Broken provider logos** - ModelSelectorLogo loads from external CDN (https://models.dev/logos/google.svg) which fails on localhost, rendering as a '+' broken image symbol in both the trigger button and dropdown items.

2. **Full-page dark overlay** - ModelSelectorContent wraps DialogContent which renders a DialogOverlay (bg-black/80) behind the selector.

3. **Misplaced close button** - DialogContent hardcodes `absolute top-4 right-4` close button. Since ModelSelectorContent applies p-0, the X button overlaps the search input with no padding buffer (wrong vertically and horizontally).

4. **Center-screen positioning** - DialogContent always centers at top-1/2 left-1/2. A model selector should be anchored near its trigger button (popover/dropdown behavior).
