---
# pawrrtal-0djm
title: Align Portless with upstream monorepo model
status: completed
type: task
priority: normal
created_at: 2026-05-02T09:27:41Z
updated_at: 2026-05-02T09:29:02Z
---

portless.json, frontend dev/portless scripts, dev.ts uses root portless + turbo false.


## Summary
- Added root portless.json (turbo: false, apps.frontend → dev:app, appPort 3001, name pawrrtal).
- Frontend uses upstream Turborepo-style scripts: dev=portless, dev:app=next dev; package.json portless key for cd frontend.
- Root frontend:dev is bunx portless; dev.ts runs bunx portless then API subdomain command.
- Removed proxy stop/start and --force from dev orchestration; plain next start for prod.
- Added portless devDependency to frontend package.
