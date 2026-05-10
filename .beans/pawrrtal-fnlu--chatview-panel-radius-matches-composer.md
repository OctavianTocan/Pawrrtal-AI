---
# pawrrtal-fnlu
title: ChatView panel radius matches composer
status: completed
type: task
priority: normal
created_at: 2026-05-05T08:41:50Z
updated_at: 2026-05-05T08:42:06Z
---

Use 14px corners on chat shell to match ChatComposer and DESIGN rounded.lg; theme rounded-xl is only 4px.



## Summary of Changes

- `ChatView`: outer shell `rounded-xl` → `rounded-[14px]` so the floating chat panel matches `ChatComposer`, composer dropdown CSS, and DESIGN.md `rounded.lg`. Theme `rounded-xl` is ~4px when `--radius: 0`.
