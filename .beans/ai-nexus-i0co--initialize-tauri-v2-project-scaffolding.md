---
# ai-nexus-i0co
title: Initialize Tauri v2 project scaffolding
status: todo
type: task
priority: high
created_at: 2026-03-04T22:12:53Z
updated_at: 2026-03-04T22:12:53Z
parent: ai-nexus-8ty6
---

Set up the Tauri v2 project structure inside the existing monorepo.

## Deliverables

- Run `npx tauri init` from the frontend directory (or manually scaffold)
- Create `src-tauri/` with:
  - `tauri.conf.json` — app identifier, window config, build commands
  - `Cargo.toml` — Tauri v2 deps, serde, thiserror
  - `src/lib.rs` — minimal app with `tauri::Builder`
  - `src/main.rs` — entry point calling lib
  - `capabilities/default.json` — core:default permissions
  - `icons/` — default app icons
- Configure `build.devUrl` to `http://localhost:3001` (Next.js dev server)
- Configure `build.frontendDist` to point at Next.js static export output
- Add Tauri CLI as a dev dependency in frontend `package.json`
- Add `tauri dev` and `tauri build` scripts to Justfile

## Notes

- Use Tauri v2 (not v1) — `@tauri-apps/cli@^2` and `@tauri-apps/api@^2`
- `lib.rs` is required for mobile support later
- Keep `src-tauri/` at the project root level (sibling to `frontend/` and `backend/`)
