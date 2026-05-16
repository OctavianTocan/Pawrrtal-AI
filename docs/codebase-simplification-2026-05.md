# Pawrrtal codebase simplification audit — May 2026

Branch audited: `origin/development` @ `46433dc`
Scope: read-only analysis only — no code changes.
Goal: identify redundancy, over-engineered abstractions, and "beginner-ish" patterns where the obvious simpler code would beat what's there now.

This is the deliverable of a multi-agent audit covering:

- `backend/app/core/` (agent loop, providers, tools, event bus, governance)
- `backend/app/api/` + `backend/app/crud/` + Pydantic schemas
- `frontend/features/chat/` (7.8k LOC, biggest feature)
- `frontend/features/{nav-chats, settings, knowledge, tasks, onboarding, …}`
- `frontend/lib/`, `frontend/components/`, `frontend/hooks/`, `frontend/shared/`
- Repo-level (CI, docker, justfile, agent config dirs, vendored libs)
- Auth / middleware / cookies (Next.js + FastAPI-Users)
- Types + config + data plumbing
- Error handling / observability
- Test infrastructure

Each finding cites repo-root-relative paths. Counts that read like exaggerations (e.g. "54 dead components") were spot-checked against the working tree. Where the audit was wrong, it's flagged in *§ False positives*.

---

## TL;DR — what's actually wrong

This codebase looks like it was built by someone who learned the rules ("split container from view," "extract every hook," "always have a CRUD layer," "wrap every framework primitive") before learning when to ignore them. The fix isn't more architecture. It's less.

Three themes run through every layer:

1. **Ceremony pretending to be architecture.** Factories where two `if`s would do; container/view splits where the container has no behavior; CRUD wrappers that forward one query; schema mirrors of ORM rows; protocol/ABC walls in front of a single implementation.
2. **Dead code on the books.** 54/58 `ai-elements/` components have zero feature callers. An empty `lib/react-overlay/` directory. Nine abandoned agent-config dirs at the repo root. Stale audit/plan markdown in `docs/`. Tests for dead components.
3. **Two of everything.** Two pre-commit runners, two nesting linters, two cookie systems, two playwright configs (one justified), two onboarding state machines, two docs trees, a desktop shell rename half-done (`AGENTS.md` still says `electron/`, only `electrobun/` exists).

The single highest-leverage action is **pure deletion** — ~8k LOC and ~12 directories that nothing depends on. The next-highest is **collapsing duplicated systems** down to one. Only after that does refactoring (chat-loop reducer, CRUD flattening, auth simplification) pay back its risk.

### Top three things to do this month

1. **Mass deletion** of dead code (Cat A below) and consolidation of duplicates (Cat B).
2. **Rewrite the chat loop** (`use-chat-turns` + `use-chat-turn-controller`) as one `useReducer`; collapse `ChatContainer` / `ChatView` (Cat D).
3. **Hoist ownership checks to a FastAPI dependency** and start inlining single-use CRUD wrappers (Cat C).

---

## A. Dead code / write-only artifacts

Pure deletion. Zero behavior change. Largest leverage in the report.

### A1. 54 of 58 `frontend/components/ai-elements/*.tsx` are unused

Only `conversation.tsx`, `shimmer.tsx`, `message.tsx`, and `prompt-input.tsx` (+ its `prompt-input-*` children, re-exported from `prompt-input.tsx`) have any callers in feature code. The other 54 components — `artifact`, `canvas`, `chain-of-thought`, `checkpoint`, `code-block`, `confirmation`, `connection`, `context`, `controls`, `edge`, `image`, `inline-citation`, `loader`, `model-selector`, `node`, `open-in-chat`, `panel`, `plan`, `queue`, `reasoning`, `sources`, `suggestion`, `task`, `thinking-dots`, `tool`, `toolbar`, `web-preview` — have **zero imports outside their own test files**.

Each comes with a `.test.tsx` sibling, which makes the surface look load-bearing in greps. They're not.

**Action:** Delete the 27 unused components and their 21 dead test files. ~6k LOC removed.

### A2. `frontend/lib/react-overlay/` is an empty directory

Literally `ls -la` shows `.` and `..` only. Yet `CLAUDE.md` enshrines `@octavian-tocan/react-overlay` as the modal source of truth, and `frontend/__mocks__/@octavian-tocan/` mocks it for Vitest.

Either it ships from npm (then the empty vendor folder is a remnant) or it never landed (then the docs lie). Confirm where the runtime imports resolve to, then delete the empty folder.

### A3. 6 unused shadcn primitives in `frontend/components/ui/`

`alert-dialog.tsx`, `combobox.tsx`, `dropdown-menu.tsx`, `resizable.tsx`, `sheet.tsx`, `skeleton.tsx` — feature code went a different direction (`AppDialog` from `react-overlay`; custom dropdowns for selectors). They have no callers; keeping them creates "why is there a `Dialog` AND an `AppDialog`?" confusion.

**Action:** Delete them. Keep only the primitives that other `components/ui/` files depend on (button, input, label, card, etc.).

### A4. Nine abandoned agent-tool config dirs at repo root

`.agents/`, `.cline/`, `.codex/`, `.factory/`, `.goose/`, `.opencode/`, `.pi/`, `.zed/`, `.beans/` are husks from past tool evaluations. Each one is:

- noise in every `find` / `ls`
- a line in `.pre-commit-config.yaml`'s exclude list (lines 15-28)
- a line in `.gitignore` and `.docignore`

Keep `.cursor/`, `.serena/`, `.claude/`, `.vscode/` (actually in use). Delete the rest.

### A5. Stale audit/plan markdown in `docs/`

`docs/` repo root contains write-only memos that nothing references:

- `docs/craft-button-guidelines.md`
- `docs/craft-resizable-panels.md`
- `docs/craft-session-list-missing-features.md`
- `docs/nav-chats-navchatsview-wiring-fix.md`
- `docs/plan-resizable-panels.md`
- `docs/sidebar-parity-audit.md`
- `docs/project-overview.html`

These are agent-produced plans/audits from completed work. Either move them under `docs/plans/done/` or delete them. They are not load-bearing documentation.

### A6. `AGENTS.md` (33k, symlinked as `CLAUDE.md`) is drifting from disk reality

`AGENTS.md` documents the project's Electron desktop shell under `electron/`. `electron/` doesn't exist on disk — only `electrobun/` does. The Electron section also references commands (`just electron-dev`, `just electron-prod`, `just electron-dist`) that no longer match `justfile`.

The file isn't too big in absolute terms; it's just out of sync. Either rename the section to `electrobun/` and update every reference, or delete the section if `electrobun/` is itself transitional.

### A7. Dead-code tests inflate test count

21 `.test.tsx` files in `frontend/components/ai-elements/` test components with zero feature callers (see A1). Total ~870 lines of green-but-meaningless test execution per CI run. Delete with the components.

---

## B. Two-of-everything systems

Pick one, delete the other.

### B1. `lefthook.yml` + `.pre-commit-config.yaml`

Two pre-commit hook runners. Whichever a dev happens to install wins. `lefthook.yml` is 15 lines (Biome + typecheck). `.pre-commit-config.yaml` is 135 lines (ruff, mypy, bandit, gitleaks, biome, conventional-commits). The `justfile` recipes mirror `pre-commit`, not lefthook.

**Action:** Delete `lefthook.yml`. Keep `.pre-commit-config.yaml` as canonical. Remove `lefthook` references from `CLAUDE.md` and `package.json`.

### B2. `scripts/check-nesting.mjs` + `scripts/check-nesting.py`

Two implementations of the same nesting-depth rule on two stacks. Both run in CI (`.github/workflows/check.yml` for `.mjs`, `tests.yml` for `.py`). The rule is identical.

**Action:** Keep `scripts/check-nesting.py` (Python is where most pre-existing offenders live, per the script's `EXEMPT_FUNCTIONS`). Replace `check-nesting.mjs` with a Biome rule (`noExcessiveNestedTestSuites` family) or inline the JS logic into one place.

### B3. `frontend/features/onboarding/` v1 + `frontend/features/onboarding/v2/`

Both ship in the binary. v1 uses tangled `useState` in `OnboardingModal.tsx` + step components; v2 has a clean reducer in `v2/OnboardingFlow.tsx` with six step components (identity, server, context, personality, messaging, plus `step-context`). The split exists with no migration plan committed.

**Action:** Decide which is live (likely v2, since v1 steps look older). Migrate any live caller to v2. Delete v1. Drop the `v2/` directory name — `v2` is now just `onboarding`.

### B4. Four `docker-compose*.yml` files

`docker-compose.yml` (76 LOC, base), `docker-compose.dev.yml` (44), `docker-compose.demo.yml` (25), `docker-compose.prod.yml` (60). 205 LOC of mostly re-stated services. Demo is dev with a different label set.

**Action:** Collapse to `compose.yml` (base) + `compose.override.yml` (loaded by default for dev) + explicit `compose.prod.yml`. Drop demo as a separate variant.

### B5. Two doc trees

`docs/` (mostly stale plan/audit markdown, plus a few real assets under `docs/deployment/` and `docs/design/`) and `frontend/content/docs/handbook/` (the actual handbook surfaced in the app at `/docs`).

The handbook is the live one. `docs/` is mostly archaeology. Move the few useful items into the handbook and reduce `docs/` to a `plans/` archive or delete it.

### B6. Two cookie layers, no documented owner

Frontend middleware (`frontend/proxy.ts:43`) checks `session_token`. Backend FastAPI-Users issues `session_token` via JWT strategy (`backend/app/api/users.py:66-85`). Rate limiter also reads it (`backend/app/core/rate_limit.py:101`). Both layers exist, neither documents which is authoritative; OAuth handler reaches into transport internals (`backend/app/api/oauth.py:147`) instead of using a public setter.

**Action:** Wrap the cookie-set operation in `users.set_session_cookie(user, response)` and use it from `oauth.py`. Document that the cookie is the sole contract between browser and server.

### B7. `dev-login` is misnamed as a proxy

`frontend/proxy.ts` is **Next.js middleware**, not a reverse proxy. The `dev-login` flow exists as a direct backend shortcut in `backend/app/api/auth.py:12-50`. Frontend `lib/api.ts:216` calls it directly. The "proxy" naming creates confusion about whether there's an actual proxy layer.

**Action:** Rename `frontend/proxy.ts` → `frontend/middleware.ts` (Next.js conventional name). Add a one-line comment on `auth.py:12` and `lib/api.ts:216` clarifying that this is a direct call, dev-only, gated by `ENV != production`.

---

## C. Backend ceremony layers (FastAPI / SQLAlchemy / Pydantic)

Pattern: every concept gets `crud/X.py` + `schemas.X*` + `api/x.py`, often with a `_x_helper.py` extracted to dodge file-size lint.

### C1. Single-use CRUD functions that forward one query

`backend/app/crud/conversation.py:101-131` (`update_conversation_title`) and `:196-229` (`update_conversation_model`) each do `select(...).where(id=, user_id=)` → mutate attribute → `commit()`. Each is called from **exactly one endpoint**.

**Action:** Inline into the endpoint handler. The endpoint *is* the transaction boundary. Keep `crud/` only for queries that are reused or that encode genuine domain logic. Expect ~20-40 functions across `crud/` to qualify for inlining.

### C2. Pydantic schema mirrors of trivial ORM models

`backend/app/schemas.py:157-177` defines `ProjectRead`, `ProjectCreate`, `ProjectUpdate` for `{id, user_id, name, created_at, updated_at}`. Identical-shape `Create` and `Update`; `Read` is the ORM model with `model_config = {"from_attributes": True}`.

**Action:** Use the ORM model in `response_model` until the wire shape genuinely diverges (field hiding, coercion). Drop `XCreate` when `XCreate == XUpdate`.

### C3. `_chat_*.py` helper files extracted to dodge file-size lint

`backend/app/api/_chat_cost_budget.py` (88 LOC), `_chat_events.py` (37 LOC), `_chat_permissions.py` (64 LOC) — each is called once from `chat.py`. The split isn't a seam; it's a workaround for the 500-line file cap.

**Action:** Lift the cap for `chat.py` to ~700 (it's the agent entry point) **or** consolidate the three into one `_chat_gates.py` since they're all pre-request gates (cost, perms, event scaffold).

### C4. Ownership-check boilerplate repeated in every endpoint

Every conversation handler in `backend/app/api/conversations.py` repeats:

```python
conversation = await crud.get_conversation(user.id, session, conversation_id)
if not conversation:
    raise HTTPException(404)
```

at lines `:95-97`, `:109-111`, and several more.

**Action:** One FastAPI dependency:

```python
async def get_owned_conversation(
    conversation_id: uuid.UUID,
    user: UserDep,
    session: SessionDep,
) -> Conversation:
    row = await session.get(Conversation, conversation_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404)
    return row
```

Endpoints take `Annotated[Conversation, Depends(get_owned_conversation)]` and stop null-checking. Apply the same pattern for `Project`, `WorkspaceFile`, etc.

### C5. 17 endpoint files for ~60 routes

`backend/main.py` imports 17 routers, several with only 2-3 endpoints (`appearance.py`, `personalization.py`, `cost.py`, `audit.py`).

**Action:** Merge by domain:

- `appearance.py` + `personalization.py` → `user_settings.py` (both 1:1 user-scoped, full-replace PUT semantics)
- `cost.py` + `audit.py` → `analytics.py` (both read-only reporting)

Brings file count to ~12 and improves cohesion. Don't go further — `chat.py` and `conversations.py` are legitimately their own domains.

### C6. Provider factory dispatches with `isinstance` on two classes

`backend/app/core/providers/factory.py:70-82` resolves a provider class via `HOST_TO_PROVIDER` table, **then** immediately checks `if provider_cls is ClaudeLLM` / `if provider_cls is GeminiLLM` to construct each one differently.

Two cases. Two constructors. The table adds a layer that doesn't pay rent.

**Action:**

```python
if parsed.host is Host.agent_sdk:
    return ClaudeLLM(...)
if parsed.host is Host.google_ai:
    return GeminiLLM(...)
raise UnknownHost(parsed.host)
```

### C7. `StreamEvent` → `AgentEvent` 1:1 translation

`backend/app/core/providers/base.py:16-36` defines `StreamEvent` (TypedDict catch-all). Each provider yields it. `backend/app/core/agent_loop/loop.py:569-609` (`_consume_llm_event`) maps each field 1:1 into `AgentEvent`. The two shapes aren't isolating different complexity — they're the same data twice.

**Action:** Have providers emit `AgentEvent` directly. Delete `StreamEvent`. Saves one mental model and ~40 LOC of translation.

### C8. Event bus has two parallel subscription mechanisms

`backend/app/core/event_bus/bus.py:85-106`: `subscribe(event_type, handler)` and `subscribe_all(handler)` keep separate dicts; both are iterated at dispatch.

`subscribe` is just `subscribe_all` plus an `isinstance` check.

**Action:** Implement `subscribe(event_type, handler)` as `subscribe_all(lambda ev: handler(ev) if isinstance(ev, event_type) else None)`. One code path, same behavior, less state.

### C9. Hand-rolled OAuth state cache in module-level dict

`backend/app/api/oauth.py:37-54`: `_state_cache: dict[str, float]` with a TTL, plus the comment "swap this for Redis... in a multi-process deployment."

This breaks the moment uvicorn workers go above 1, and there's no rate limit on issue.

**Action:** Use Redis (already in `docker-compose.yml`) or, simpler still, a stateless signed JWT for state. Rate-limit `_issue_state()` to ~5/IP/minute.

### C10. `AgentHandler` and `NotificationService` as classes with `register(bus)`

`backend/app/core/event_bus/handlers.py:55-100`. Both classes take `self`, then call `bus.subscribe(...)` from `register`. Stateless orchestrators wearing a class costume.

**Action:** Make them functions: `register_agent_handler(bus, deps)` and `register_notification_service(bus, deps)`. Call from `lifespan`.

### C11. `Channel` protocol in front of one implementation

`backend/app/channels/` defines a `Channel` protocol. There's one concrete implementation (`SSEChannel`). A protocol is for ≥2 implementations or a stable plugin seam — otherwise it's just a typing wall in front of a concrete class.

**Action:** Either delete the protocol and use `SSEChannel` directly, or commit to adding a second channel (websocket?) — don't keep the seam empty.

### C12. Config sprawl: `Settings` + dataclasses + module constants

`backend/app/core/config.py` holds ~60 fields. `backend/app/core/agent_loop/types.py` defines `AgentSafetyConfig` that mirrors some of them. `backend/app/core/event_bus/handlers.py:40-52` redefines `_PAYLOAD_PROMPT_BUDGET_CHARS`, `_TELEGRAM_MESSAGE_CHARS`, `_PAYLOAD_LEAF_PREVIEW_CHARS` as module constants.

**Action:** Pull all configurable values into `Settings`; access via DI (`SettingsDep = Annotated[Settings, Depends(get_settings)]`). Replace module-level magic numbers.

### C13. Runtime config checks on every event

`backend/app/core/chat_aggregator.py:29-31` checks `settings.secret_redaction_enabled` on every event. `backend/app/core/workspace.py` checks `settings.workspace_context_enabled` on every call. These are static after boot.

**Action:** Compute once in `lifespan`; pass as constructor args. Removes runtime branching and makes the dependency explicit.

---

## D. Frontend chat is too clever for its own good

`features/chat/` is 7.8k LOC and most of it is plumbing for plumbing.

### D1. `ChatContainer` extracts four single-call hooks to dodge a lint budget

`frontend/features/chat/ChatContainer.tsx:104-150` defines `useSelectedChatModel` (152 lines), `useSelectedReasoning` (20), `useComposerGate` (34), `useChatActivitySync` (20). Each is called **exactly once**, from `ChatContainer` itself. A comment at line 176 admits these exist to stay under the per-function line budget.

They aren't reusable. They aren't tested separately. They're a lint workaround dressed as architecture.

**Action:** Inline them, raise the function-line cap for `ChatContainer.tsx`, or merge into one `useChatLifecycle()` that returns `{model, reasoning, composer, activity}`.

### D2. `isSendingRef` + `hasSentRef` reimplement TanStack mutation state

`frontend/features/chat/hooks/use-chat-turns.ts:65-70` uses two refs to mutually-exclude concurrent sends and detect first-send. TanStack Query's `useMutation` gives you `isPending` (replaces `isSendingRef`) and `isIdle` (replaces `hasSentRef`) for free.

**Action:** Replace both refs with `mutation.isPending` / `mutation.isIdle`. Drop the manual ref-sync that runs every render.

### D3. `chatHistoryRef.current` reads to patch a stale closure

`frontend/features/chat/hooks/use-chat-turn-controller.ts:138-139` stashes `chatHistoryRef.current` in `regenerateMessage`, dodging the stale closure from a `useCallback` that doesn't list `chatHistory` as a dep.

This is the textbook signal that the whole flow should be a `useReducer`. Sending an event from the SSE stream into a reducer eliminates the closure problem entirely.

**Action:** Move `applyChatEvent` logic into a `chatReducer(state, action)` consumed via `useReducer`. Drop `chatHistoryRef`.

### D4. `setChatHistory(prev => updateLast(prev, msg => applyChatEvent(msg, ev)))` is a reducer in disguise

`frontend/features/chat/hooks/use-chat-turns.ts:82-92`. Three nested functional `setState` calls reach into a deeply-pure function. That **is** `useReducer`, written badly.

Fixing D3 (the reducer) fixes this for free.

### D5. `ChatContainer` → `ChatView` with 19 props, then re-spread to nested views

`ChatContainer.tsx:356-380` passes 19 props to `ChatView` (`ChatView.tsx` is 428 LOC). `ChatView` re-spreads to `LandingState` and `ActiveConversationState` (nested functions sharing the full prop closure). The container/view split is paying no rent — neither side is independently testable, and nothing else renders that view.

**Action:** Merge `ChatContainer` and `ChatView` into one component. Extract `LandingState` and `ActiveConversationState` as siblings with typed minimal props, not nested functions.

### D6. `features/chat/types.ts:20-29` re-exports `@/lib/types` with no transformation

Pure indirection. Delete the file; let callers import from `@/lib/types` directly.

### D7. `useComposerGate` is business logic dressed as a hook

`frontend/features/chat/ChatContainer.tsx:263-296`. Eight booleans in, a discriminated `{isComposerBlocked, composerBlockedMessage, openSetup}` out. No subscriptions, no effects.

**Action:** `buildComposerState(config)` as a pure function called inside the component. Reserve hooks for hooks.

---

## E. Cross-feature duplication that wants one primitive

Do this **after** the dead-code purge — half the duplicators may disappear.

### E1. Row + 3-dot menu + rename/delete dialog

Reimplemented in:

- `frontend/features/nav-chats/components/ConversationSidebarItemView.tsx:150-431`
- `frontend/features/knowledge/components/FileRow.tsx:80-200`
- `frontend/features/tasks/components/TaskRow.tsx:46-80`
- `frontend/features/settings/integrations/IntegrationRow.tsx`

Same shape: selection state, content slot, right-aligned menu, rename/delete dialog. Different domain models.

**Action:** One `<EditableRow>` in `components/ui/` (or `components/feature/`) taking `{ content, actions: ActionSchema[], onRename, onDelete }`. Kills ~600 LOC of duplicated menu/dialog/state plumbing.

### E2. Dialog chrome reimplemented per dialog

`ConversationRenameDialog.tsx:47-100`, `AddIntegrationModal.tsx:35-92`, `AddCustomMcpModal.tsx`, etc. each manually compose `AppDialog` + `AppDialogFooter` + `AppFormRow`. Spacing, button layout, callout patterns are identical but recreated. Some dialogs (e.g. `TelegramConnectDialog`) bypass `AppDialog` entirely and use raw `Dialog`, in violation of the rule in `CLAUDE.md`.

**Action:** Wrap `AppDialog` in a schema-driven builder accepting `{ title, description, fields, actions }`. Forbids the bypass pattern by being more convenient.

### E3. Settings sections: 8 bespoke cards for the same shape

`AppearanceSection`, `GeneralSection`, `PersonalizationSection`, `UsageSection`, `ArchivedChatsSection`, etc. all repeat title + description + `<SettingsCard>` + rows. Each is 30-60 LOC of nearly identical JSX.

**Action:** `<SettingsSectionLayout config={{ title, description, rows }} />`. Uses the existing `primitives.tsx` `SettingsCard`/`SettingsRow` but makes the section layer config-driven. ~200 LOC.

### E4. `use-*-handlers.ts` files called from exactly one component

E.g. `frontend/features/tasks/use-tasks-handlers.ts` (~100 LOC) extracts handlers that the container calls once. They're not unit-tested separately (they just call setters), they're not reused. Pure indirection.

**Action:** Inline. Repeat for every `use-*-handlers.ts` / `use-*-actions.ts` with a single caller.

### E5. Cross-feature React Query patterns repeat without sharing

Each feature reimplements `useAuthedFetch`-wrapped query/mutation hooks with bespoke invalidation. A `queryOptions()` factory (TanStack Query v5 idiom; see *§ Modern stack opportunities*) gives you typed query keys, prefetch, and invalidation in one place.

**Action:** Centralize a `queryKeys` factory in `frontend/lib/query-keys.ts`. Then for each feature, define `xQueryOptions(id)` colocated with the feature. Cache invalidation becomes `queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })`.

Don't try to abstract the *mutation* side with a generic factory — that usually backfires.

---

## F. Frontend shared/utility layer

### F1. Vendored "libs" that are or aren't libraries

`frontend/lib/react-chat-composer/` and `frontend/lib/react-dropdown/` ship with their own `package.json` and are published under `@octavian-tocan/*`. The repo also has `frontend/__mocks__/@octavian-tocan/` which mocks them, implying both that the npm packages exist and that the vendored copies are a fallback.

`frontend/lib/react-overlay/` is an empty placeholder (see A2).

**Action:** Decide — either install all three from npm as proper deps (delete the vendored copies), or own them as monorepo packages (move to `packages/`, give them a build script, drop the `lib/` location). The current half-step (vendored + mocked + referenced as if external) is the worst of both worlds.

### F2. `frontend/hooks/use-tooltip-dropdown.ts` and `use-pointer-down-commit.ts` belong in `react-chat-composer`

Both are used **only** inside `lib/react-chat-composer/src/hooks/` and are already re-exported from the composer's hooks barrel. The `frontend/hooks/` copies are duplicates.

**Action:** Delete the `frontend/hooks/` copies; import from the composer.

### F3. Icon strategy: three conventions in one codebase

`components/icons/` (1 file), `components/brand-icons/` (8 files), 105 inline `lucide-react` imports. Three idioms, no policy.

**Action:** lucide-react for generic UI icons; `brand-icons/` for OAuth/provider logos only; inline SVG forbidden. Delete `components/icons/`. Add the policy to `DESIGN.md`.

### F4. `frontend/hooks/use-authed-fetch.ts` lives in `hooks/` but is the API boundary

The hook + its query sibling are the canonical API contract (auth header injection, 401 retry). They belong in `frontend/lib/api/` next to `api.ts` and `API_ENDPOINTS`. Today they're in `hooks/`, which makes "where do I touch the API?" non-obvious.

**Action:** Move to `frontend/lib/api/` (turn `lib/api.ts` into `lib/api/index.ts`); re-export from a barrel; update imports.

---

## G. Auth / middleware

### G1. `useAuthedFetch` duplicates what middleware + cookies should handle

`frontend/hooks/use-authed-fetch.ts:1-62` wraps `apiFetch` with `credentials: 'include'` and 401 → `router.replace('/login')`. The middleware in `frontend/proxy.ts` already redirects unauthenticated users before the page renders. The hook's 401 handler is a fallback for a problem the middleware should prevent.

**Action:** Move 401 handling fully into middleware. Shrink the hook to `(url, init) => fetch(url, { ...init, credentials: 'include' })` or, better, delete the hook and use a plain `fetch` helper.

### G2. `window.location.replace('/')` post-login is a workaround for an SSR race

`CLAUDE.md` documents that `LoginForm` must use `window.location.replace('/')` (full-page navigation) instead of `router.push('/')`, because client-side nav fires authed queries before the browser has committed the `Set-Cookie` response — observed on Safari.

That's not a cookie issue. That's a sequencing problem: the SPA reads cookies via fetch headers before the browser writes them. The right fix is to invalidate the React Query cache **after** the cookie is confirmed (via a small `await fetch('/api/auth/me')` step) and then `router.push`. Or — most cleanly — submit login as a React 19 Action that returns the user shape, then push.

**Action:** Replace the full-page reload with a `useActionState` form (see *§ Modern stack opportunities*) that returns the user and clears the query cache before pushing.

### G3. Multiple `Depends()` variants overlap without a documented hierarchy

`current_active_user` (`backend/app/api/users.py:94-97`) and `get_allowed_user` (used 27× across routes) and the FastAPI-Users internal auth check are three layers — only two named. `get_allowed_user` is the canonical "authenticated AND allowed by email allowlist" check.

**Action:** Rename `current_active_user` → `_current_active_user` (private). Rename `get_allowed_user` → `get_authenticated_user`. Add a docstring stating that routes use only `get_authenticated_user`.

### G4. Hand-rolled rate limiter + request logger middleware

`backend/app/core/rate_limit.py` and `backend/app/core/request_logging.py` are bespoke FastAPI middleware. `slowapi` (rate limit) and `asgi-correlation-id` + `structlog` (request logging) handle both off the shelf with less code.

**Action:** Replace `rate_limit.py` with `slowapi`. Replace `request_logging.py` with `asgi-correlation-id` + structlog config (see H4).

---

## H. Error handling / observability

### H1. Broad `except Exception` blocks that swallow failures

`backend/app/core/event_bus/handlers.py:130-136` and `backend/app/core/scheduler/scheduler.py:144-150` log at `.exception()` then silently `return`. Event handler failures don't surface to users; scheduler hydration errors are silently skipped.

**Action:** Catch the specific exceptions you actually expect (`asyncio.TimeoutError`, `ValueError`, etc.). Let unexpected exceptions propagate to the bus/scheduler level so they show up in metrics and trigger alerts.

### H2. Frontend doesn't handle 429 / 402 distinctly

Backend returns `429` with `retry_after_seconds` (`backend/app/core/rate_limit.py:138-159`) and `402` with `remaining_usd` (`backend/app/core/governance/middleware.py:146-159`). Frontend `apiFetch` treats them as generic errors — no toast explaining the budget cap, no auto-retry.

**Action:** Add explicit branches in the API error pipeline for both statuses; render a `RateLimitedToast` with countdown for 429 and a `BudgetExceededToast` for 402.

### H3. Claude/Gemini error stringification can leak sensitive context

`backend/app/core/providers/claude_provider.py:352-355` and `gemini_provider.py:241-244, 431-432` directly `str(error)` into `StreamEvent` bodies. SDK errors can include file paths, API key snippets, or env var values, which then ride the SSE stream into the browser.

**Action:** Map to typed `ProviderError(code, public_message)` before yielding. Log the full error server-side with structured context; send only `public_message` over the wire.

### H4. Three uncoordinated logging surfaces

`backend/app/core/request_logging.py` (logging + contextvar), `backend/app/core/telemetry.py` (manual OTel spans), `backend/app/logger_setup.py` (handler config). A request that hits middleware → API → agent loop → tool → provider produces 5 disconnected log events.

**Action:** Adopt `structlog` with `asgi-correlation-id` for `request_id`; bind `user_id` and `conversation_id` once per request via `structlog.contextvars`. Every log line then carries the trace identifiers automatically. See https://www.structlog.org/.

### H5. Frontend error surfaces are fragmented

`frontend/lib/toast.ts` (Sonner toasts) for API errors. `frontend/app/error.tsx` (Next.js error boundary) for render errors — no toast. Tool errors in the agent loop yield SSE `error` events that may or may not fire a toast.

**Action:** Single `reportError(err, { surface, context })` helper that always toasts and optionally captures to telemetry. Wrap major feature roots in `<ErrorBoundary onError={reportError}>`.

---

## I. Types / config / data plumbing

### I1. No backend↔frontend type codegen — hand-maintained drift bait

`backend/app/schemas.py` (~451 LOC of Pydantic) defines wire shapes. `frontend/lib/types.ts` (~202 LOC) and per-feature `types.ts` mirror them as TS interfaces. No codegen step. A field rename ships green and breaks at runtime.

**Action:** `openapi-typescript` against FastAPI's `/openapi.json` at frontend build. Replace hand-written TS shapes for request/response bodies with the generated types. Keep hand-written types only for view models that genuinely differ from wire shapes.

### I2. Multiple tsconfigs without clear ownership

Root `tsconfig.json` (target ESNext, used by `commit.ts`/`dev.ts`/`check-policies.mjs`), `frontend/tsconfig.json` (target es2022), and `frontend/lib/react-chat-composer/tsconfig.json`. The root config's scope is unclear.

**Action:** Document the invariant in the root `tsconfig.json` ("scope: repo-root scripts only, do not extend from frontend"). Or, if the root scripts aren't worth a separate config, point them at `frontend/tsconfig.json` and delete the root one.

### I3. Query keys scattered with inconsistent shape

Some features use constants (`PROJECTS_QUERY_KEY = ['projects']`), others use bare strings (`CHAT_MODELS_QUERY_KEY = 'models'`), many use inline `['conversations']`. Mixed arrays/strings break `invalidateQueries`.

**Action:** Single `frontend/lib/query-keys.ts` factory with the TanStack v5 `queryOptions()` idiom. Every key is `as const` array. See E5.

### I4. API endpoint constants well-centralized but unenforced

`frontend/lib/api.ts:1-337` excellently centralizes endpoints in `API_ENDPOINTS`. Nothing prevents new code from inlining `fetch('/api/v1/...')` literals.

**Action:** Add a Biome custom rule (or `dependency-cruiser` gate) forbidding literal `/api/` strings outside `lib/api.ts`.

### I5. Two CSS sources of truth — `globals.css` and `DESIGN.md`

Canonical token values live in `frontend/app/globals.css`; `DESIGN.md` mirrors them as YAML for machine readability. Two places to update; one sync linter (`design:lint`) catches drift, but the burden is real.

**Action:** Generate `DESIGN.md`'s token YAML from `globals.css` via a small script. Single source of truth.

---

## J. Repo-level / devops

### J1. Scripts sprawl — 12 files in `scripts/`, several inlinable

`scripts/` contains:

```
agents-md-doctor.py        check-no-tools-in-providers.py
build-local-libs.sh        check-view-container.mjs
check-docs.ts              dedupe_default_workspaces.py
check-file-lines.mjs       dev-console-smoke.mjs
check-nesting.mjs          install-self-hosted-runner.sh
check-nesting.py           sentrux-check.sh
```

Several are <100 LOC wrappers around one invocation. Keep the substantial ones (`dev-console-smoke.mjs`, `install-self-hosted-runner.sh`, `agents-md-doctor.py`). Fold smaller ones into `justfile` recipes or compose into one `just lint-all`.

### J2. GitHub Actions runner-label sprawl

Workflows mix `[self-hosted, openclaw-mini, pawrrtal]`, `[self-hosted, pawrrtal]`, and `ubuntu-latest`. No documented mapping of which workflow needs which runner. If `openclaw-mini` is retired, several workflows will hang.

**Action:** Add `.github/RUNNERS.md` documenting which labels exist and which workflows use them. Consolidate to one label (`[self-hosted, pawrrtal]`) where possible.

### J3. Backend `tests/` has 56 files with heavy fixtures

This is **good** (deterministic, leak-free) — not a finding. Flagged here so simplification doesn't accidentally rip it out. The `agent_harness.py` `ScriptedStreamFn` pattern in particular is worth preserving.

---

## § Modern stack opportunities

Patterns from current (2025-2026) official docs that simplify code Pawrrtal already writes. Each cites the upstream source.

### Next.js 16

- **Cache Components (`'use cache'` directive + `cacheLife`/`cacheTag`/`updateTag`)** replaces `unstable_cache`, `fetch({ next: { revalidate, tags } })`, and segment config (`export const revalidate`, `dynamic`, `fetchCache`). The legacy guide is now explicitly labeled "Caching and Revalidating (Previous Model)." Opt in via `cacheComponents: true` in `next.config.ts`. Source: https://nextjs.org/docs/app/getting-started/caching
- **Partial Prerendering (PPR) becomes default with Cache Components.** Wrap runtime-data components (`cookies()`, `headers()`, uncached fetches) in `<Suspense>`. Replaces the "is this route static or dynamic?" segment-config dance.
- **`fetch` is no longer cached by default** in App Router. To cache, mark the wrapping function `'use cache'`. Don't hand-roll `cache: 'force-cache'`.
- **`React.cache(fn)` for per-request memoization of non-fetch DB calls** replaces module-level `Map` caches.

### React 19

- **`ref` as a regular prop** replaces `forwardRef`. Codemod ships. Source: https://react.dev/reference/react/forwardRef
- **`useActionState` + `<form action={fn}>` + `useFormStatus`** replaces the `useState` pair `[isPending, error]` and custom submit hooks. Directly applicable to `LoginForm` (see G2) and every settings form.
- **`useOptimistic(state)`** replaces the "two `useState`s, swap on settle, revert on error" pattern. Applicable to nav-chats rename and any conversation reorder.
- **`use(promise)` / `use(context)`** lets you read promises in the render path and call context after early returns — replaces the `useEffect` + `useState` ceremony for "I just want to await this server promise."
- **`<Context value="...">`** replaces `<Context.Provider value="...">`. Cosmetic.

### TanStack Query v5

- **`queryOptions({ queryKey, queryFn, ... })` factory** replaces per-feature `queryKeys` constants. One typed factory feeds `useQuery`, `prefetchQuery`, `setQueryData`, `getQueryData` with full inference. See E5 and I3. Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-options
- **`useSuspenseQuery`** removes `isLoading`/`isError` branches. `data` is non-nullable. Pairs well with React 19's Suspense improvements.
- **Variables-based optimistic UI** (`useMutation().variables` rendered directly while `isPending`) replaces manual `onMutate` snapshot/rollback for the common "show the new item in this list" case.

### Tailwind CSS v4

- **CSS-first config via `@theme { --color-foo: ... }` in `globals.css`** replaces `tailwind.config.js`. Tokens become real CSS variables automatically — would also help with I5 (single source of truth for `DESIGN.md`).
- **`@import "tailwindcss";`** replaces the three `@tailwind base/components/utilities;` directives.

### FastAPI

- **`Annotated[X, Depends(...)]` + reusable type aliases** is now the docs-preferred form over `x: X = Depends(...)`. Eliminates per-route repetition. Pairs with C4 (owned-conversation dependency).
- **`lifespan` async context manager** replaces `@app.on_event("startup")` / `@app.on_event("shutdown")`.

### SQLAlchemy 2.x

- **`select(Model).where(...)` + `await session.execute(stmt)`** replaces `session.query(Model).filter(...)`. Confirm CRUD layer uses the 2.x style throughout when inlining (C1).
- **`async_sessionmaker(engine, expire_on_commit=False)` + per-request session** is canonical. Use `selectinload()` for eager loading.

### Pydantic v2

- **`model_config = ConfigDict(...)`** replaces inner `class Config:`. **`@field_validator` / `@model_validator(mode='after')`** replace `@validator` / `@root_validator`. **`model_dump()` / `model_validate()`** replace `.dict()` / `.parse_obj()`. **`@computed_field`** replaces ad-hoc `@property` + manual serialization.

### No clear shift here

Python 3.12 `TaskGroup` / PEP 695 type params / `match` — language features, no documented "stop doing X" pointer; use where they read better.
Biome and Vitest — no major doctrine shift to call out.

---

## § Phased plan

Sequence chosen so each phase de-risks the next.

### Phase 1 — Pure deletion (1 PR, low risk)

A1, A2, A3, A4, A5, A7. Plus delete `lib/react-overlay/` if A2 confirms it's a remnant.

- Net diff: ~8k LOC removed across ~80 files.
- Verification: `bun run check`, `bun run test`, `just dev` cold-boot smoke.
- Reviewer effort: low (deletions only).

### Phase 2 — Pick one of every duplicate (2-3 PRs)

- B1 (delete lefthook).
- B2 (one nesting linter).
- B3 (collapse onboarding to v2).
- A6 (reconcile `AGENTS.md` with disk reality).
- B7 (`proxy.ts` → `middleware.ts`).

### Phase 3 — Backend ownership / CRUD flattening (2-3 PRs)

- C4 (FastAPI `get_owned_X` dependency rolled out across conversations / projects / workspace_files).
- C1 (inline single-use CRUD).
- C5 (merge `appearance` + `personalization`, `cost` + `audit`).
- C6 (kill the provider factory dispatch).

### Phase 4 — Frontend chat reducer (1 large PR)

- D3 + D4 (rewrite as `useReducer`).
- D2 (drop `isSendingRef` / `hasSentRef`).
- D5 (collapse Container/View).
- D1 (inline the four lint-workaround hooks).

### Phase 5 — Cross-feature primitives (2-3 PRs)

- E1 (`<EditableRow>`).
- E2 (schema-driven `AppDialog` builder).
- E3 (`<SettingsSectionLayout>`).
- E5 (TanStack `queryOptions` factory).

### Phase 6 — Modernization (optional, do as you touch files)

- React 19 `useActionState` for login (G2) and settings forms.
- `Annotated[X, Depends(...)]` in new endpoints.
- `openapi-typescript` for shared types (I1).

---

## § False positives — what NOT to change

Audits got loud about these; they're actually fine.

- **`get_X_router() -> APIRouter` factory wrappers.** Marginally indirect, but `main.py` reads cleanly and the cost is one function call. Not worth the diff.
- **Empty `crud/__init__.py`.** Fine. Python tradition.
- **Aggressive `scripts/` consolidation.** `dev-console-smoke.mjs` and `check-policies.mjs` are real programs, not one-liners. Don't cram them into `justfile`.
- **Backend tests' fixture density.** Heavy but intentional. The `ScriptedStreamFn` harness in `tests/agent_harness.py` is a load-bearing pattern.
- **Two Playwright configs.** `playwright.stagehand.config.ts` legitimately differs from `playwright.config.ts` (180s timeout, full trace/video/screenshot capture for AI-driven runs). Keep both.
- **`__mocks__/@octavian-tocan/react-dropdown.tsx`.** Intentional fallback for ephemeral checkouts. Wired in `vitest.config.ts:79-86`. Keep.
- **Test naming convention (colocated `.test.tsx`).** Single consistent convention; do not migrate.
- **A `useResourceMutation` factory across mutations.** Over-abstracting React Query mutates almost always regresses. The query-options factory (E5) is fine; mutations should stay close to their endpoints.

---

## § Verification notes

- LOC counts are from `wc -l` against the checkout at `46433dc`.
- "Zero callers" claims (A1, A3, F2) were validated via `grep -rl` across `frontend/` excluding `__tests__/` and the source file itself.
- The "two desktop shells" claim from the initial audit was wrong — there is only `electrobun/` on disk. `AGENTS.md` references a non-existent `electron/` (A6).
- The "`lib/react-overlay/` is empty" claim was verified — `ls -la` shows only `.` and `..`.
- File counts for `ai-elements/` (A1) were checked: 58 component `.tsx` files, 21 `.test.tsx` files; of the 58 components, only 4 have any importer in feature code.

---

## § Open questions for the reviewer

Items I can't decide without product context:

1. **Is `electrobun/` the long-term desktop story, or is it transitional?** Determines whether to update `AGENTS.md` to match it (A6) or remove the section.
2. **Is `dev-login` (B7) intentionally available in non-prod, or should it be gated by an explicit `ENV=development` check at the route level?**
3. **Onboarding v1 vs v2 (B3)** — which is actually rendered in production today?
4. **Are vendored `react-chat-composer` and `react-dropdown` (F1) shipping fork-edits, or are they pristine drops of the npm versions?** If fork-edited, they should move to `packages/` with their own build; if pristine, they should be dependencies.
5. **Cost / rate-limit response shapes (H2)** — is the frontend supposed to drive retries, or is the user expected to dismiss and retry manually?

---

End of report. Open to discussion before any of these are landed.
