# Repo intent — what this app is, and what I think you're trying to build

> Author: agent reading the code, 2026-05-08.  Living doc — Tavi's
> answers below my questions become canonical, and any future agent
> starting from cold should read this first.

## Why this exists

Ground rule: **make my intent obvious to any agent reading this code**.
That's the explicit goal Tavi gave me, so the rest of this doc is
written for an agent reading it, not a human reviewer.  If something
here is wrong or missing, treat the codebase as ground truth and
update this file.

## High-level intent — what I'm reading

**A self-hosted, multi-surface AI workspace** centered on a streaming
chat with first-class agent tooling.  Reading the code, the shape is:

1. **Chat is the front door.**  The chat UI (Next.js + a streaming SSE
   endpoint at `POST /api/v1/chat/`) is the primary surface.  Every
   other feature feeds into or out of a conversation.

2. **The agent has a workspace, not just a chat history.**
   `app/api/workspace.py` + `backend/app/models.py::Workspace` describe
   "OpenClaw-style agent home directories" with `AGENTS.md`, `SOUL.md`,
   `USER.md`, `IDENTITY.md`, `memory/`, `skills/`, `artifacts/`.
   Conversations and tools both reference a workspace path.  The agent
   has somewhere to *be*, not just somewhere to talk.

3. **Channels are equal peers.**  `backend/app/channels/base.py` defines
   `Channel` as a protocol — `SSEChannel` (web + Electron) and
   `TelegramChannel` (progressive-edit message delivery via aiogram)
   are equals.  The core agent loop never knows which surface it's
   talking to.  Future channels (mobile push, others) plug in here.

4. **Providers are equal peers too.**  `backend/app/core/agent_loop/`
   is a Pi-Mono-inspired provider-agnostic loop: each provider (Claude,
   Gemini, Agno during the experiment) supplies a `StreamFn`, the loop
   handles turn lifecycle + tool calls + (now) safety guards.  The
   loop never imports a provider SDK directly.

5. **The desktop shell is real, not a wrapper.**  `electron/` spawns
   Next.js as a subprocess in production, has its own IPC surface
   (`electron/src/ipc.ts`), file watchers, and workspace handlers.
   Web parity is required, but the desktop has ambitions of its own
   (filesystem access, native menus, persistent window geometry).

6. **There's a coherent design system.**  `DESIGN.md` (Craft Agents-
   inspired editorial palette + Newsreader/Google Sans typography)
   is canonical; `frontend/app/globals.css` mirrors it; biome enforces
   no literal Tailwind colors and no ad-hoc radii.  This is not a
   throwaway look.

7. **It's getting close to a product.**  PRs in flight:
   - rename to **Pawrrtal** (#121), branding centralized so future
     renames are a one-file edit
   - swap MIT → **FSL-1.1-Apache-2.0** (source-available, converts to
     Apache-2.0 after 2y)
   - permission modes for tools (#120) — Plan, Ask-to-Edit (default),
     Auto-Review (deferred), Full Access, Custom (UI-disabled)
   - agent-loop safety layer (#122) — max iterations, wall-clock,
     consecutive errors, retry-with-backoff
   - frontend-stack spikes (#123) — testing whether to move off
     Next.js (React+Vite, +TanStack Router, SvelteKit, Solid)

## What I'm fairly sure I read correctly

### Architecture
- **Frontend:** Next.js App Router, React 19, Tailwind 4, shadcn-style
  UI, React Query for mutations, custom `@octavian-tocan/react-overlay`
  + `@octavian-tocan/react-dropdown` for modals/dropdowns.
- **Backend:** FastAPI + SQLAlchemy async + aiosqlite + alembic.
  `fastapi-users` for JWT-cookie auth.  Custom Fernet-encrypted column
  type for stored API keys.
- **Database:** dual-DB pattern was the historical setup (app metadata
  in SQLite, Agno-managed message history in its own DB), but recent
  commits (`backend/app/api/chat.py` aggregator, `chat_messages` table)
  suggest the assistant turn is now persisted directly into the app
  DB and the Agno DB is being phased out.  README still references
  the dual-DB diagram; update needed.
- **Streaming:** SSE frames `data: {"type":"delta","content":"..."}`
  +  `tool_use` / `tool_result` / `thinking` / `error` / `[DONE]`.
- **Telegram:** aiogram, polling by default, webhook in prod.
  Progressive `bot.edit_message_text` with debounce (~3s/20 chars).
- **Workspaces:** real directories under `WORKSPACE_BASE_DIR` (defaults
  to `/data/workspaces`).  Per-user, per-named-workspace.  Default
  workspace seeded from onboarding personalization.
- **Permissions (in flight):** `app/core/permissions/` enforces tool
  category whitelists per mode + system-prompt addenda + a runtime
  gate.  The model sees only the tools its mode allows.
- **Branding:** centralizes via `frontend/shared/branding.ts` +
  `backend/app/core/branding.py` (post-Pawrrtal PR).

### What's been built and deliberately scoped down
- No real-time collaboration (single user per workspace).
- No vector store wiring yet — `frontend/features/knowledge/` exists
  with file-tree UI but no obvious RAG pipeline.  Agents read files
  via tools instead.
- Mobile is not a separate codebase — Telegram covers "chat from your
  phone" today; an APNs/FCM channel is sketched in
  `app/channels/base.py` comments but not implemented.
- Custom-mode permissions (`permissions.json` per workspace) is wired
  in the UI but disabled with a "coming soon" hint.
- Auto-review (LLM judges tool calls) is a stub — bean filed.

### Conventions an agent should know
- **`AGENTS.md` at the repo root is the constitution.**  Read it before
  touching anything.  It lists the workflow rules, command surface,
  CI gates, design system rules, and architecture boundaries.
- **`.beans/`** = task tracking.  Don't edit by hand, use `beans`
  CLI.  Each in-flight area has a bean.
- **`.claude/rules/`** = behavioral rules for AI agents working on
  this repo, scoped by file path.  Vendored from
  `OctavianTocan/claude-rules`.
- **`just` is the task runner.**  `just dev`, `just check`,
  `just test`, etc.  CI uses the same commands.
- **CI is OctavianTocan-only** by intentional gate — every workflow has
  an actor check.
- **TypeScript strict, explicit return types on all exports, TSDoc
  on all exports.**  Biome enforces it.
- **Frontend talks to the backend only via the API.**  No mixing.
  Use `useAuthedFetch` or React Query mutations.
- **No `text-gray-*` / no new `--radius-*`** — go through DESIGN.md.

## Open questions for Tavi

These are the places where I read the code and could go either way.
Answer here so the next agent doesn't have to ask again.

1. **Audience.**  Is this:
   - (a) Tavi's personal workspace that you also self-host for friends?
   - (b) A single-tenant product you're considering selling
     (FSL-1.1 + "stronger license" + "might make it into a product"
     suggests this)?
   - (c) Both — same codebase, deploy modes diverge?
   *If (b), is the eventual hosting model self-host-only, managed
   cloud, or both?*

2. **Relationship to OpenClaw.**  The workspace structure
   (`AGENTS.md`, `SOUL.md`, etc.) clearly mirrors OpenClaw conventions,
   and your VPS already runs Wretch + Hermes via OpenClaw.  Is
   Pawrrtal:
   - (a) A web/desktop UI for the OpenClaw agents you already run?
   - (b) An independent agent runtime that happens to use the same
     filesystem conventions?
   - (c) Designed to interoperate — workspaces created here are
     readable by OpenClaw agents and vice versa?

3. **Channels roadmap.**  Today: web (SSE), desktop (Electron over the
   same SSE), Telegram (progressive edits).  What's the **ranked**
   priority of the next channel?  Mobile push (APNs/FCM)?  WhatsApp?
   Slack?  Email-in?  Voice (we already have STT wired)?  Or are you
   converging on "any messenger Tavi uses → bot adapter → channel"?

4. **Multi-user / sharing.**  `frontend/features/access-request-banner/`
   talks about "@handle is requesting access" with multiple requesters.
   Does this mean:
   - (a) You're planning multi-user workspaces (team)?
   - (b) "Access" is for resources within a single user's workspace
     (file or workspace permission requests)?
   - (c) It's mock-only UI from the design phase and the backend
     doesn't model it yet?

5. **Knowledge base scope.**  `frontend/features/knowledge/` has a
   file-tree viewer + editor but I don't see a RAG ingestion pipeline.
   Is the model:
   - (a) Knowledge IS the workspace filesystem — agents read files via
     tools, no embeddings layer at this stage?
   - (b) RAG is planned but not started — the file viewer is just the
     capture surface for now?
   - (c) Knowledge is for human reading + agent tool access, not for
     a separate vector store at all?

6. **Projects vs workspaces.**  A user can own multiple workspaces AND
   organize conversations into projects.  Are these orthogonal axes
   (project = label, workspace = filesystem context) or are they
   collapsing into one concept eventually?

7. **Provider strategy.**  The agent loop is provider-agnostic, but
   I see Gemini as the default + Claude SDK + the dropped Agno
   experiment.  Long-term goal:
   - (a) Provider-agnostic forever — let the user pick per turn?
   - (b) Pick one (which?) and provider-agnostic is just an escape
     hatch for routing failures?
   - (c) Multi-provider with a router (Auto-Review judge?) doing the
     selection?

8. **Voice + transcription.**  `app/api/stt.py` proxies to xAI's STT.
   Is voice:
   - (a) Input only ("press to talk → transcribe → send as text")?
   - (b) Full duplex (TTS reply too) — and if so, on which channels?
   - (c) Mobile-driven — built for Telegram voice notes specifically?

9. **Permission modes — UX intent.**  The current UI shows Plan,
   Ask-to-Edit (default), Auto-Review (disabled), Full Access,
   Custom (disabled).  Long-term, do you want:
   - (a) Five modes forever, with Auto-Review and Custom actually
     implemented?
   - (b) Collapse to three (Plan / Ask / Full) once Auto-Review's
     reviewer-LLM design is settled?
   - (c) Per-tool permissions (granular allowlists) replacing modes
     entirely?

10. **The Pawrrtal cat theme.**  The PR set `PRODUCT_THEME = "cat"`
    but didn't ship a palette.  Is the intent:
    - (a) Cat-themed accents and an icon set, single theme?
    - (b) Multiple themes selectable from settings, cat being the
      default?
    - (c) Theming is a stretch goal — the constant is just future-proofing?

11. **Frontend stack decision.**  The four spikes (#123) exist so we
    can compare.  What are the **decision criteria** I should use to
    rank them?  I assumed bundle size + dev-x + parity with current
    Next.js features, but you may weight DX × team-size × deploy-cost
    differently.

## How to use this doc

- **You (Tavi):** answer the questions inline, edit the inferred
  facts where I got them wrong.  I'll read your edits as canon next
  time I touch the repo.
- **Future agents:** read this top-to-bottom before making
  architectural decisions.  Update inferences when the code shifts;
  bring questions back to Tavi rather than guessing.

## Appendix — files I read to write this

- `README.md`, `AGENTS.md`, `DESIGN.md`, `.claude/CLAUDE.md`
- `backend/main.py`, `backend/app/models.py`, `backend/app/schemas.py`
- `backend/app/api/{chat,conversations,workspace,channels,personalization,stt}.py`
- `backend/app/channels/{base,sse,telegram}.py`
- `backend/app/core/agent_loop/{loop,types}.py`
- `backend/app/core/providers/{base,claude_provider,gemini_provider,factory}.py`
- `backend/app/core/permissions/*.py`
- `backend/app/integrations/telegram/bot.py`
- `frontend/features/{chat,onboarding,knowledge,channels,projects,access-request-banner}/`
- `frontend/shared/branding.ts`, `electron/src/{main,server,ipc}.ts`
- `package.json`, `justfile`, `.gitmodules`
- recent in-flight PRs (#120 permissions, #121 Pawrrtal, #122 safety,
  #123 spikes, #124 ci-greenify)
