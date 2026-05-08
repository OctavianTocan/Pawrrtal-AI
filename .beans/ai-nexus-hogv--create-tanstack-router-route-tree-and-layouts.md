---
# pawrrtal-hogv
title: Create TanStack Router route tree and layouts
status: scrapped
type: task
priority: high
created_at: 2026-03-26T17:28:27Z
updated_at: 2026-05-07T16:24:57Z
parent: pawrrtal-id67
blocked_by:
    - pawrrtal-ow61
---

Plan Task 3. Define the route tree, auth guard, and layout components.

## Files
- Create: `frontend/src/router.tsx` — route tree with auth guard, 6 routes, layout nesting
- Create: `frontend/src/layouts/app-layout.tsx` — sidebar wrapper (replaces app/(app)/layout.tsx)
- Create: `frontend/src/layouts/auth-layout.tsx` — centered card layout for login/signup

## Steps
- [ ] Create app-layout.tsx — renders NewSidebar with Outlet
- [ ] Create auth-layout.tsx — centered div with Outlet
- [ ] Create router.tsx — createRootRouteWithContext, appLayout with beforeLoad auth guard, authLayout, all 6 routes, type registration
- [ ] Verify: tsc --noEmit on the new files
- [ ] Commit

## Reasons for Scrapping

User confirmed 2026-05-07: the Vite + TanStack Router migration is not happening. The codebase has continued deepening Next.js usage (Electron shell mounts the Next app, channels and onboarding routes live under `app/`, no Vite scaffolding exists). Closing this and the rest of the cluster: pawrrtal-id67, pawrrtal-91ch, pawrrtal-ow61, pawrrtal-57ic, pawrrtal-hogv, pawrrtal-335f, pawrrtal-fc8j.
