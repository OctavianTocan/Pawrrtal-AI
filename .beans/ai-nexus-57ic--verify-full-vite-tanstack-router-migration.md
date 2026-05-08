---
# pawrrtal-57ic
title: Verify full Vite + TanStack Router migration
status: scrapped
type: task
priority: normal
created_at: 2026-03-26T17:29:23Z
updated_at: 2026-05-07T16:24:57Z
parent: pawrrtal-id67
blocked_by:
    - pawrrtal-335f
---

Final verification after all Next.js code is removed.

## Checklist
- [ ] `cd frontend && bun run build` produces dist/ with index.html
- [ ] `cd frontend && bun run dev` starts Vite on port 3001
- [ ] Login page renders at /login
- [ ] Login redirects to / with sidebar
- [ ] New conversation works (UUID generated, chat streams)
- [ ] Existing conversation loads messages (/c/:id)
- [ ] Sidebar shows conversations, search works, right-click menu works
- [ ] Dark mode toggles with system preference
- [ ] `bun run typecheck` passes
- [ ] `bun run fix` (Biome) passes
- [ ] `grep -r "next/navigation\|next/headers\|next/server\|next/script" frontend/` returns zero
- [ ] `grep -r "NEXT_PUBLIC_" frontend/` returns zero
- [ ] Production build serves correctly via `bunx serve dist`

## Reasons for Scrapping

User confirmed 2026-05-07: the Vite + TanStack Router migration is not happening. The codebase has continued deepening Next.js usage (Electron shell mounts the Next app, channels and onboarding routes live under `app/`, no Vite scaffolding exists). Closing this and the rest of the cluster: pawrrtal-id67, pawrrtal-91ch, pawrrtal-ow61, pawrrtal-57ic, pawrrtal-hogv, pawrrtal-335f, pawrrtal-fc8j.
