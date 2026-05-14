---
# pawrrtal-5rwv
title: 'Decide: privileged-ops in Electron main vs bundled FastAPI sidecar'
status: completed
type: feature
priority: high
created_at: 2026-05-05T06:07:44Z
updated_at: 2026-05-05T07:05:11Z
---

**Context.** The Pawrrtal desktop shell ships, but the FastAPI backend isn't bundled. To make the agent able to modify the user's computer (file edits, shell commands, local workspace scanning), we need privileged code running locally — either in the Electron main process or in a bundled backend.

**Craft Agents pattern (researched 2026-05-05).** They do **not** bundle a backend. Privileged tool calls run in the Electron main process via Node `fs/promises` + `child_process`, gated by a path allowlist. Renderer ↔ main is a local WebSocket RPC; renderer is sandboxed (`contextIsolation: true`, `nodeIntegration: false`). They DO bundle the Claude Agent SDK native binary (~210 MB) + `bun` + `uv` runtimes via `extraResources`.

**Two viable paths:**

- **Path A — privileged ops in Electron main (Craft's pattern, recommended default).**
  Keep FastAPI remote/optional for auth + persistence. Move file/shell tools into Electron main with new namespaced IPC channels (`fs:*`, `shell:*`, `workspace:*`). No Python packaging, smaller download, no subprocess lifecycle, security model well-understood.

- **Path B — bundle FastAPI as a PyInstaller sidecar.**
  electron-builder ships `backend-macos-arm64` etc in `extraResources`; main spawns on free port. Single tool implementation. Adds 80–150 MB, fiddly Python packaging (numpy/tiktoken/sqlalchemy native deps), code-signing + notarization complications.

**Recommendation.** Start with Path A. Add Path B later if a single tool implementation becomes load-bearing.

**Decision deliverable.** ADR at `frontend/content/docs/handbook/decisions/YYYY-MM-DD-electron-privileged-ops.md` documenting which path was picked and why.

## Todo
- [ ] Read this bean + the Craft research notes in this branch's most recent assistant summary
- [ ] Pick A or B
- [ ] Write the ADR
- [ ] Open the follow-up implementation bean (one of the two below)

## Outcome

Decision documented in frontend/content/docs/handbook/decisions/2026-05-05-electron-privileged-ops-in-main.md (Path A — privileged ops in Electron main + client-tool agent pattern). Implementation landed on branch `feat/electron-privileged-ops`.
