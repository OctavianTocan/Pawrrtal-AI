---
# pawrrtal-m2nn
title: Electrobun README + dev doc accuracy
status: completed
type: task
priority: normal
created_at: 2026-05-13T21:40:41Z
updated_at: 2026-05-13T21:41:07Z
---

Restructure README (Telegraf-style clarity), fix :3001 and just/bun commands, align electrobun.config.ts and server.ts comments.



## Summary of changes

- Rewrote electrobun/README.md: one-line pitch, at-a-glance bullets, prerequisites, accurate dev flow (just electrobun-dev, :3001/:8000, PAWRRTAL_REPO_ROOT), docs map, security note, upstream pointer.
- electrobun.config.ts header already reflected :3001; confirmed.
- electrobun/src/bun/server.ts: startDevServer JSDoc and PAWRRTAL_REPO_ROOT error/help text aligned with repo root bun run dev and package.json start script.
