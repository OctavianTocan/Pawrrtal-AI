---
# pawrrtal-car0
title: Splash window + electron-dev-full one-shot command
status: completed
type: feature
priority: normal
created_at: 2026-05-06T11:29:19Z
updated_at: 2026-05-06T11:29:31Z
---

Open the BrowserWindow immediately with an inline splash so missed dev-server starts surface visibly instead of as a silent dock icon. Add electron-dev-full just recipe that orchestrates backend + frontend + Electron in a single terminal.


## Summary of Changes

- **electron/src/main.ts** — refactored `bootstrap` so the BrowserWindow opens immediately with an inline splash data URL ('Starting Pawrrtal… Waiting for dev server on :3001'). Once the server resolves, swap to its real URL via `loadURL`. If the server times out, swap to an inline error data URL with the exact `just dev` / `just electron-dev-full` instructions instead of leaving the user with a silent dock icon.
- **electron/dev-all-full.ts** (new) — sibling to `dev-all.ts`. Spawns the root `bun run dev.ts` orchestrator (FE + BE), waits for :3001 via TCP polling, then launches Electron. Cleans up cleanly on Ctrl-C / process exit.
- **electron/package.json** — added `dev:all:full` script.
- **justfile** — added `electron-dev-full` recipe (`cd electron && bun run dev:all:full`).

Gates: electron tsc clean, electron tests 45/45 green, biome warnings on dev-all-full.ts mirror the existing dev-all.ts ones (intentional orchestrator logs).
