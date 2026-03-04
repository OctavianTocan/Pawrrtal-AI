---
# ai-nexus-80au
title: Bundle Python backend as Tauri sidecar
status: todo
type: task
priority: high
created_at: 2026-03-04T22:13:15Z
updated_at: 2026-03-04T22:13:15Z
parent: ai-nexus-8ty6
blocked_by:
    - ai-nexus-i0co
---

Package the FastAPI backend as a sidecar binary that Tauri launches and manages alongside the desktop app.

## Deliverables

- Use PyInstaller (or Nuitka) to bundle the FastAPI backend into a standalone binary
- Configure Tauri sidecar in `tauri.conf.json`:
  ```json
  "bundle": {
    "externalBin": ["binaries/ai-nexus-backend"]
  }
  ```
- Add `tauri-plugin-shell` for sidecar management
- Create Rust command to spawn/manage the backend process:
  - Start backend on app launch (pick available port)
  - Gracefully shutdown on app close
  - Health check before frontend loads
- Pass backend URL to frontend via Tauri state or window event
- Handle platform-specific binary naming (`-x86_64-apple-darwin`, etc.)

## Notes

- Sidecar binaries need to follow Tauri naming convention: `binaries/name-{target-triple}`
- The backend needs to bind to `127.0.0.1` (not `0.0.0.0`) for security in desktop context
- SQLite DB path should use Tauri's app data directory (`app.path().app_data_dir()`)
- Consider: should we skip sidecar for v1 and just connect to Railway? Simpler but requires internet.
