---
# pawrrtal-400y
title: Mirage virtual filesystem capability (Notion read-only first)
status: todo
type: feature
priority: normal
tags:
    - backend
    - agents
created_at: 2026-05-07T02:39:47Z
updated_at: 2026-05-07T02:39:47Z
blocked_by:
    - pawrrtal-4956
---

Adopt strukto-ai/mirage to expose external services (Notion, GDrive, S3,
Slack, GitHub, …) to chat agents as a single virtual filesystem. Agents
reason via `ls`/`cat`/`grep` instead of N SDK-shaped tools per service.

Reference: https://github.com/strukto-ai/mirage and the 2026-05-07 chat
thread "Mirage virtual filesystem for AI agents". Headline: per-service
tool sprawl is the dominant failure mode of agentic apps; Mirage's
filesystem abstraction collapses N×M (services × per-service tools) into
N (one mount per service) plus a fixed bash vocabulary the model already
speaks fluently.

## Depends on

- pawrrtal-4956 — provider-agnostic capability/tool registry. Mirage
  registers as one capability against that registry. Without the
  registry, Mirage would re-introduce the same per-provider shim
  problem we are deleting.

## Scope (v1)

- **Notion only. Read-only.** Writes are too easy for an agent to
  misintuit; ship them later behind a separate flag.
- **Single capability** — e.g. `vfs_exec` — that runs a bash command
  in the workspace and returns stdout/stderr. The system prompt tells
  the model the workspace contains `/notion`.
- **Per-user auth** — each request constructs a new `Workspace` with
  a Notion token resolved from the authenticated user, not a
  process-wide singleton. Mirage's quickstart implies global config;
  verify per-request instantiation is feasible without monkey-patching.
- **Cache layer** — rely on Mirage's built-in dispatcher cache for v1;
  measure latency before adding a second layer.

## Open questions to resolve in spike

- Does Mirage's `NotionResource` render pages as markdown or as raw
  blocks? (Affects prompt instructions and what `cat` returns.)
- How does Mirage handle Notion rate limits? (Notion API is 3 req/s;
  an agent doing `grep alert /notion/**/*.md` could fan out fast.)
- License compatibility with Pawrrtal.
- Maturity — read NotionResource source, scan issues/PRs, decide
  whether to bet on it now or wait a release.
- Whether `Workspace.execute` is safe to expose directly or whether
  we want a narrower set of subcommands (read-only `ls`/`cat`/`grep`).

## Files affected (likely)

- `backend/app/core/tools/mirage_vfs.py` — Capability impl wrapping
  `Workspace.execute`
- `backend/app/core/tools/__init__.py` — register
- `backend/app/core/providers/factory.py` — register Mirage capability
  when `NOTION_TOKEN` (or equivalent) is configured
- `backend/app/core/config.py` — Notion token setting
- `backend/pyproject.toml` — add `mirage-ai`

## Acceptance

- [ ] Spike: read-only Notion access works on Claude provider end-to-end.
      User asks "what's on my Engineering page?", agent runs
      `ls /notion/Engineering` then `cat <file>`, answers.
- [ ] Per-user auth wired — no Notion token leak between users.
- [ ] Latency budget documented for a typical "browse + read 1 page"
      turn.
- [ ] Decision logged in `frontend/content/docs/handbook/decisions/` whether to expand to
      additional Mirage resources (S3, GDrive, Slack, GitHub) in a
      follow-up.
- [ ] **Zero provider-specific Mirage shim.** All integration is via
      the capability registry from pawrrtal-4956.

## Out of scope (this bean)

- Write operations to Notion.
- Other Mirage resources (S3, GDrive, Slack, GitHub, …).
- Frontend UX for FS-style tool calls in the chat stream (Epic 7).
