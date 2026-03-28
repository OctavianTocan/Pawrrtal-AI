---
# ai-nexus-91ch
title: Create Vite entry point and CSS
status: todo
type: task
priority: high
created_at: 2026-03-26T17:28:46Z
updated_at: 2026-03-26T17:28:46Z
parent: ai-nexus-id67
blocked_by:
    - ai-nexus-fth4
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
