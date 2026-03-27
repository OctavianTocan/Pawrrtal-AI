---
# ai-nexus-ow61
title: Install Vite deps and create build config
status: todo
type: task
priority: high
created_at: 2026-03-26T17:28:18Z
updated_at: 2026-03-26T17:28:18Z
parent: ai-nexus-id67
---

Plan Tasks 1+2. Set up Vite as the build tool, replacing Next.js.

## Files
- Modify: `frontend/package.json` — remove next, add vite + @tanstack/react-router + @vitejs/plugin-react
- Create: `frontend/vite.config.ts` — Vite config with React + Tailwind plugins, @/ alias
- Create: `frontend/index.html` — SPA entry with dark mode script
- Modify: `frontend/tsconfig.json` — remove Next.js plugin, add vite/client types
- Modify: `frontend/lib/api.ts` — NEXT_PUBLIC_API_URL → import.meta.env.VITE_API_URL
- Create: `frontend/.env` — VITE_API_URL=http://localhost:8000

## Steps
- [ ] `bun remove next` and `bun add @tanstack/react-router` and `bun add -d vite @vitejs/plugin-react @tailwindcss/vite`
- [ ] Create vite.config.ts with React + Tailwind plugins, @/ alias, port 3001
- [ ] Create index.html with dark mode script and `<div id="root">`
- [ ] Update tsconfig.json — remove next plugin/includes, add vite/client types
- [ ] Update lib/api.ts — change env var to import.meta.env.VITE_API_URL
- [ ] Create .env with VITE_API_URL
- [ ] Verify: `tsc --noEmit` (expect some errors from missing main.tsx — OK)
- [ ] Commit
