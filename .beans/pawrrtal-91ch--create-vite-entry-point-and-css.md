---
# pawrrtal-91ch
title: Create Vite entry point and CSS
status: scrapped
type: task
priority: high
created_at: 2026-03-26T17:28:46Z
updated_at: 2026-05-07T16:24:57Z
parent: pawrrtal-id67
blocked_by:
    - pawrrtal-fth4
---

Plan Task 5. Wire up the React root with RouterProvider + QueryClientProvider.

## Files
- Create: `frontend/src/main.tsx` — React root, QueryClient, RouterProvider
- Create: `frontend/src/index.css` — Tailwind imports + globals.css reference

## Steps
- [ ] Create src/index.css — @import tailwindcss, @source directives for components/features/routes, @import globals.css
- [ ] Create src/main.tsx — createRoot, QueryClient, QueryClientProvider, RouterProvider, ReactQueryDevtools
- [ ] Verify: `bunx vite build` produces dist/ with index.html
- [ ] Commit

## Reasons for Scrapping

User confirmed 2026-05-07: the Vite + TanStack Router migration is not happening. The codebase has continued deepening Next.js usage (Electron shell mounts the Next app, channels and onboarding routes live under `app/`, no Vite scaffolding exists). Closing this and the rest of the cluster: pawrrtal-id67, pawrrtal-91ch, pawrrtal-ow61, pawrrtal-57ic, pawrrtal-hogv, pawrrtal-335f, pawrrtal-fc8j.
