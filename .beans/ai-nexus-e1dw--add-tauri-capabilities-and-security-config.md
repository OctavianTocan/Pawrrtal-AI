---
# ai-nexus-e1dw
title: Add Tauri capabilities and security config
status: todo
type: task
priority: normal
created_at: 2026-03-04T22:13:34Z
updated_at: 2026-03-04T22:13:34Z
parent: ai-nexus-8ty6
blocked_by:
    - ai-nexus-i0co
---

Set up Tauri v2 capabilities and CSP for the desktop app's security model.

## Deliverables

- `capabilities/default.json` with permissions:
  - `core:default` — base window/event permissions
  - `shell:allow-spawn` — for sidecar backend management
  - `shell:allow-open` — for opening external links in browser
  - `http:default` — for API calls to backend (localhost + Railway)
- Configure CSP in `tauri.conf.json`:
  - Allow connections to localhost (sidecar backend)
  - Allow connections to Railway production URL
  - Allow Google Fonts CDN
- Add `tauri-plugin-http` if needed for CORS-free backend communication
- Add `tauri-plugin-store` for persisting user preferences locally (auth token, backend URL, etc.)

## Notes

- Tauri v2 denies everything by default — this is the security foundation
- CSP should be as restrictive as possible while allowing app to function
- `tauri-plugin-http` bypasses browser CORS — useful for sidecar communication
