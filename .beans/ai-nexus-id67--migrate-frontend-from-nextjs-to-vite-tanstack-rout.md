---
# ai-nexus-id67
title: Migrate frontend from Next.js to Vite + TanStack Router
status: scrapped
type: epic
priority: high
created_at: 2026-03-26T17:28:06Z
updated_at: 2026-05-07T16:24:57Z
---

Single-codebase SPA that works in both browser and Electron. Replaces Next.js with Vite + TanStack Router.

Plan: `docs/superpowers/plans/2026-03-26-vite-tanstack-migration.md`

## Scope
- 6 routes to convert
- 2 server components → client
- 7 files with Next.js router imports
- Zero backend changes

## Reasons for Scrapping

User confirmed 2026-05-07: the Vite + TanStack Router migration is not happening. The codebase has continued deepening Next.js usage (Electron shell mounts the Next app, channels and onboarding routes live under `app/`, no Vite scaffolding exists). Closing this and the rest of the cluster: ai-nexus-id67, ai-nexus-91ch, ai-nexus-ow61, ai-nexus-57ic, ai-nexus-hogv, ai-nexus-335f, ai-nexus-fc8j.
