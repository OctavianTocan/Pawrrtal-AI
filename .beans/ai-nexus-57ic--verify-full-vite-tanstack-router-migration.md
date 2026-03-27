---
# ai-nexus-57ic
title: Verify full Vite + TanStack Router migration
status: todo
type: task
priority: normal
created_at: 2026-03-26T17:29:23Z
updated_at: 2026-03-26T17:29:23Z
parent: ai-nexus-id67
blocked_by:
    - ai-nexus-335f
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
