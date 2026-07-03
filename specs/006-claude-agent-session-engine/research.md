# Research: Agent Provider Session Engine

## Decision 1: Use NanoClaw's provider loop as the reference shape

**Decision**: Pawrrtal's provider contract should follow NanoClaw's important boundary, not its entire runtime. A provider exposes identity and capabilities, starts a query from a decoded input, returns a handle that supports push/end/abort, emits normalized events, owns opaque continuation, detects stale continuation, and can request continuation rotation before resume.

**Evidence**: NanoClaw's `AgentProvider` exposes `query(input)`, `isSessionInvalid`, optional `maybeRotateContinuation`, and an `AgentQuery` with `push`, `end`, `events`, and `abort`. Its events include `init`, `result`, `error`, `progress`, and mandatory `activity` for every underlying SDK event so liveness checks stay honest. Source: https://raw.githubusercontent.com/nanocoai/nanoclaw/main/container/agent-runner/src/providers/types.ts

**Rationale**: This is the part that makes Claude a first proving provider without making Claude the system model. Opaque continuation and activity events are especially important for long-running agent work.

**Alternatives considered**:

- Directly embed Claude Agent SDK in the session service: rejected because future providers would inherit Claude-specific session and event semantics.
- Copy current Pawrrtal Python provider signatures: rejected because the Python backend is changing and is not the target architecture.
- Adopt NanoClaw's full container/session design in this feature: rejected because containerization, secrets, and full Workspace isolation are explicitly split into 008 and later specs.

## Decision 2: Implement the boundary in Effect TS under `backend-ts`

**Decision**: 006 creates Effect TS contracts and runtime modules under `backend-ts`, with `packages/domain-core` for shared schemas/errors, `packages/api-core` for HTTP/OpenAPI contracts, `packages/rpc-core` for Effect RPC protocols, `packages/harness` for provider lifecycle, `apps/api` for HTTP handlers/repos/layers, and `apps/rpc` for RPC handlers/layers.

**Evidence**: The current `backend-ts/CONVENTIONS.md` defines an older two-package contract/runtime split where `packages/api-core` owns Schema/HttpApi/errors and `apps/api` owns handlers, services, repos, and layers. The user's clarified boundary is stricter: `api-core` should mean HTTP/OpenAPI only. The 003 overhaul names the Effect TS path as the migration target and says the current Python code is not the end-state.

**Rationale**: The user explicitly rejected current Python as an architectural example. The provider session engine should be the target boundary that later migration work adopts.

**Alternatives considered**:

- Add this to Python first and port later: rejected because it would define the new session model in the system being replaced.
- Put everything in `apps/api`: rejected because the app runtime would become the abstraction and future CLI/SDK consumers could not reuse it cleanly.

## Decision 3: Claude Agent SDK is the first real provider

**Decision**: The first real provider adapter wraps `@anthropic-ai/claude-agent-sdk` and maps SDK messages/hooks into Pawrrtal provider events. It should support streaming input via async iterable prompts, SDK session resume when configured, lifecycle startup when useful, and hooks for unsupported interactive affordances.

**Evidence**: The official TypeScript docs describe `query({ prompt, options })`, where `prompt` can be a string or `AsyncIterable<SDKUserMessage>`, and `query()` returns an async generator of SDK messages. The docs also expose `startup()` for pre-warming the CLI subprocess. Source: https://code.claude.com/docs/en/agent-sdk/typescript

NanoClaw's Claude provider uses the SDK `query()`, push-based message stream, Claude resume, system prompt append, tool allow/deny lists, hooks, transcript archiving, stale-session detection, and continuation rotation. Source: https://raw.githubusercontent.com/nanocoai/nanoclaw/main/container/agent-runner/src/providers/claude.ts

**Rationale**: Claude is the requested proving provider and NanoClaw has already exposed the practical issues: headless user-question flows, plan/worktree UI affordances, long transcript resumes, and liveness during tool work.

**Alternatives considered**:

- Treat Claude as a plain chat-completions model: rejected because the feature is specifically provider-backed agent sessions, not another one-shot model path.
- Use only Claude Code CLI print mode: rejected for this slice because the requested reference is Claude Agent SDK and its richer session/hooks surface.

## Decision 4: Use a deterministic provider as the required second proof

**Decision**: The first implementation must include a selectable deterministic provider that satisfies the same manifest, event, continuation, cancellation, and conformance contract as Claude.

**Rationale**: The spec requires Claude plus another provider proof. A deterministic provider gives CI a reliable second implementation without prematurely choosing a second real provider or blocking on external credentials.

**Alternatives considered**:

- Add a second real provider immediately: rejected for 006 because provider choice intersects with ACP, sandbox, and credential work.
- Use mocks only: rejected because mocks can test consumers but do not prove a provider can be selected and run through the real registry.

## Decision 5: Provider manifests are decoded configuration, not informal objects

**Decision**: Provider identity, capabilities, setup requirements, continuation behavior, event support, and unsupported behavior must be Effect Schema classes. Public provider/turn/event shapes live in `@pawrrtal/domain-core`; `harness`, `api-core`, and `rpc-core` import those public schemas and add only their own transport/runtime-specific declarations.

**Rationale**: This prevents the same drift that happened in the CLI work: multiple sources of truth for docs/runtime/completions. Provider manifests should be the single source for selection, diagnostics, OpenAPI output, CLI output, and conformance.

**Effect mechanics**:

- Use `Schema.Class` for public domain values.
- Use `Schema.TaggedErrorClass` for provider/setup/continuation/capability errors.
- Use `.annotations(...)` or `.annotate(...)` consistently so OpenAPI and generated docs are useful.
- Use `Config.schema(...)` and `ConfigProvider` for environment/file-backed provider config.
- Use Schema decoders only at true external boundaries, then immediately produce typed domain values; do not let raw external payloads pass through the app.

## Decision 6: Normalize events before public clients see them

**Decision**: Backend HTTP/RPC/`paw` clients consume only Pawrrtal `AgentProviderEvent` and `AgentTurnState` values. Native Claude SDK messages, CLI stdout fragments, hosted-agent payloads, or future ACP updates are provider-private diagnostics until decoded and normalized.

**Rationale**: This is the main boundary that lets provider implementation change without public contract rewrites.

**Alternatives considered**:

- Store native provider event payloads directly in visible session events: rejected because it would leak provider-specific behavior into every surface.
- Collapse all events into text deltas: rejected because tools, denials, progress, cancellation, and recoverable failures need distinct states.

## Decision 7: Continuation is provider-scoped and rotation-aware

**Decision**: Continuation records include provider id, continuation token reference, provider session id, fingerprint, last activity, resume support, rotation policy, and invalidation reason. Provider switches never reuse another provider's continuation.

**Evidence**: NanoClaw stores provider session continuity as an opaque provider concern and includes `maybeRotateContinuation` to avoid cold-resume failures when transcript files become too large or old. Source: https://raw.githubusercontent.com/nanocoai/nanoclaw/main/container/agent-runner/src/providers/types.ts

**Rationale**: The feature needs durable multi-turn continuity without pretending every provider can resume the same way.

## Decision 8: Keep containerization, credentials, and full Workspace isolation out of 006

**Decision**: 006 threads `workspaceId` through sessions and provider turn inputs, then materializes a decoded, redacted Workspace summary at turn start. Mounts, container lifecycle, OneCLI-style gateway behavior, Infisical/agent-vault secrets, and per-user isolation are deferred to 008 and secrets specs.

**Evidence**: NanoClaw's host runner resolves providers, builds mounts, composes agent surfaces, applies a credential gateway, and spawns containers. Source: https://raw.githubusercontent.com/nanocoai/nanoclaw/main/src/container-runner.ts. Its runner reads `/workspace/agent/container.json` and routes all IO through session DBs. Source: https://raw.githubusercontent.com/nanocoai/nanoclaw/main/container/agent-runner/src/index.ts

**Rationale**: Those are useful references, but mixing them into 006 would make the provider contract depend on a runtime substrate the user has not chosen yet.

## Decision 9: Session IO lessons inform invariants, not storage choice

**Decision**: Adopt NanoClaw's invariants conceptually: one owner for each mutable stream, explicit liveness, recoverable pending work, and visible failure. Do not copy its two-SQLite-DB container bridge into 006.

**Evidence**: NanoClaw's session manager documents a two-DB split and one-writer-per-file invariants to avoid host/container SQLite corruption and stale reads. Source: https://raw.githubusercontent.com/nanocoai/nanoclaw/main/src/session-manager.ts

**Rationale**: Pawrrtal's 003 direction uses a different future substrate. The invariant is portable; the file-level implementation is not.

## Decision 10: `harness` is a harness package, not a second API

**Decision**: `harness` is a reusable provider harness package consumed by `apps/api`, `apps/rpc`, tests, and future workers. It does not define frontend routes and it does not replace `api-core`. The shortened name follows the user's preferred Pawrrtal convention while retaining the `effect-api-layout` separation between harness library, API contracts, and app transports.

**Rationale**: Provider lifecycle is not the same thing as API transport. The API layer should expose provider definitions and turn/event operations; the engine layer should own SDK/CLI adapter behavior, streams, cancellation, continuation, and conformance. Keeping those separate lets Pawrrtal test and run providers without starting the web frontend and prevents HTTP handlers from becoming the provider abstraction.

**Frontend rule**: frontend work is out of scope for 006. A later frontend slice must call `apps/api` via the generated HTTP client/OpenAPI or an RPC client generated from `rpc-core`; it never imports `harness`.

**Alternatives considered**:

- Put provider adapters directly in `apps/api`: rejected because app handlers become hard to reuse from CLI/worker/conformance tests.
- Put public API routes in `harness`: rejected because it would create two API surfaces and confuse frontend ownership.

## Decision 11: Use Effect RPC for internal/streaming boundaries, not local package calls

**Decision**: Define `RpcProtocol.ts` groups in `rpc-core` for provider/turn operations that benefit from streaming or internal service calls. Implement handlers in `apps/rpc/src/Modules/*/Rpc.ts`. Shared payload schemas and errors come from `domain-core`. Direct in-process calls from `apps/api` or `apps/rpc` to `harness` remain Effect service/layer calls; RPC is for transport boundaries, actor/worker hops, and streaming clients.

**Evidence**: `effect-api-layout` keeps RPC protocol files in a shared contract package, implements handlers in `apps/rpc/src/Modules/*/Rpc.ts`, and serves `/rpc` through `RpcServer.layerProtocolHttp`. Pawrrtal's stricter naming decision is that its `api-core` package is HTTP/OpenAPI-only, so the shared protocol-package role becomes `rpc-core` here. Its harness package is a separate library consumed by app code, not an HTTP route package.

**Rationale**: This gives Pawrrtal a typed internal transport without turning the harness package into an API server. It also prevents RPC from coupling to HTTP/OpenAPI just because both transports share payload schemas.

## Decision 12: `paw-cli` is part of the test and operator surface for 006

**Decision**: 006 includes minimal `paw` commands for provider inspection and turn control:

- `paw providers list`
- `paw providers doctor [provider]`
- `paw sessions send`
- `paw sessions events <session-id>`
- `paw sessions cancel-turn <session-id>`

**Rationale**: A provider engine without an operator surface is hard to validate outside unit tests. The CLI makes provider readiness, deterministic turns, event ordering, and cancellation testable from the same public API/RPC surface a frontend would use, while keeping frontend work out of this feature. 006 does not create a persistent agent registry, so CLI commands target a session invocation: an existing session with Workspace/provider binding, or a new session request with explicit Workspace and provider references.

**Alternatives considered**:

- Test only through Effect services: rejected because it misses API serialization and operator usability.
- Build a frontend surface now: rejected because the user explicitly wants backend/base work without frontend friction.
