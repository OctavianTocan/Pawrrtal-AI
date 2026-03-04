---
# ai-nexus-a99h
title: Configure Next.js for Tauri static export
status: todo
type: task
priority: high
created_at: 2026-03-04T22:13:03Z
updated_at: 2026-03-04T22:13:03Z
parent: ai-nexus-8ty6
blocked_by:
    - ai-nexus-i0co
---

Configure Next.js to support both dev mode (with Tauri devUrl) and production static export for Tauri bundling.

## Deliverables

- Add `output: 'export'` to `next.config.ts` (conditional — only for Tauri builds)
- Handle dynamic routes (`/c/[id]`) — may need fallback or Tauri-side routing
- Ensure API calls use configurable base URL:
  - Dev: `http://localhost:8000` (local backend)
  - Desktop prod: `http://localhost:8000` (sidecar) or Railway URL
- Test that `next build` produces a static `out/` directory Tauri can serve
- Ensure `tauri dev` proxies to Next.js dev server correctly

## Notes

- Next.js 16 App Router with static export has limitations (no SSR, no API routes)
- Our frontend is already client-side rendered with React Query, so this should be mostly fine
- The backend URL needs to be configurable at runtime (not baked into build)
