# Implementation Plan: Agent Provider Session Engine

**Branch**: `development` / SpecKit feature `006-claude-agent-session-engine` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-claude-agent-session-engine/spec.md`

## Summary

Build Pawrrtal's next session executor around a provider-neutral agent session contract, with Claude Agent SDK as the first real provider and a deterministic provider as the required second proof. The design reference is NanoClaw's agent-provider loop: provider identity, opaque continuation, pushable follow-up input, cancellable event streams, explicit capability declarations, and liveness/activity events. Current Pawrrtal Python provider/session code is legacy context only; it is not the target architecture for this feature.

The implementation target is the Effect TypeScript backend path under `backend-ts/`, not FastAPI. This feature should create the provider session boundary that later Python replacement work consumes, instead of copying the soon-to-change Python session model. Frontend/UI integration is out of scope; prove the engine through backend HTTP/RPC contracts, provider conformance, and `paw`. `harness` is not a public API surface, it is the reusable provider harness that `apps/api`, `apps/rpc`, `paw-cli`, tests, and future workers can call.

## Technical Context

**Language/Version**: TypeScript on Bun, using Effect v4. Current local evidence shows root TypeScript peer `^6.0.3`, `packages/paw-cli` on TypeScript `6.0.3` and Effect `4.0.0-beta.92`, and `backend-ts` still on Effect `4.0.0-beta.91` with TypeScript `^5.9.3`. Implementation should align `backend-ts` to the latest compatible Effect v4 beta and TypeScript 6 line before adding the new provider package, using `backend/vendor/effect-smol/` as the API source of truth.

**Primary Dependencies**: `effect` v4 (`Schema`, `Config`, `Layer`, `Stream`, `Queue`, `Scope`, `Effect.fn`, annotated logs/spans), `effect/unstable/httpapi` for HTTP contracts/OpenAPI/Scalar, `@effect/platform-bun` for Bun runtime services, `@effect/vitest` for effectful tests, `@anthropic-ai/claude-agent-sdk` for the first real provider, the existing `backend-ts` workspace, and `packages/paw-cli` as the operator/test surface.

**Storage**: First slice uses a repository port for provider sessions, turns, and normalized events. Runtime storage should fit the 003 direction: live turn/session state eventually belongs behind the per-session actor/session-store port, while queryable summaries project to the API-owned record store. This plan does not reuse the current Python tables as the model.

**Testing**: `@effect/vitest` conformance suites for provider definitions, event normalization, continuation ownership, cancellation, follow-up ordering, stale-session recovery, capability decisions, cross-Workspace isolation, and deterministic-provider proof. Contract tests use `HttpApiTest` for the API groups and `RpcTest`/in-process RPC handlers where streaming/internal calls are exposed. CLI smoke tests exercise the same public surface through `paw providers ...` and `paw sessions ...` so the feature has a real operator surface beyond unit tests. Package gates: `cd backend-ts && bun run typecheck`, `cd backend-ts && bun run test -- agent-provider`, `cd backend-ts && bun run check`, `bun run paw-cli:check`; repo gate remains `just check` when the slice is ready for integration.

**Target Platform**: Effect TS shared-domain, HTTP API, RPC, app runtime, provider harness packages, and `paw` operator flows. Frontend/chat rendering is not part of this plan and is not an acceptance surface.

**Project Type**: Backend architecture slice plus contract packages. It introduces neutral domain contracts, HTTP contracts, RPC contracts, a provider harness package, and app runtime wiring.

**Performance Goals**: First visible normalized progress/activity event within 3 seconds under normal local conditions for Claude when credentials/runtime are available. Deterministic provider conformance should run in under 5 seconds in CI. Provider manifest/readiness checks should not start a long-running agent process unless explicitly requested.

**Constraints**: NanoClaw is the design reference, not a dependency. 006 does not adopt NanoClaw containerization, OneCLI/agent-vault credential gateway, no-config philosophy, per-user container model, Workspace preview, Workspace-diff inspection, or frontend/web-chat rendering; those belong to later specs if needed. Public surfaces must not depend on provider-native payloads. Provider continuation is provider-scoped and never reused across providers. Public schemas and provider contracts should avoid untyped values and absent-value sentinels; optionality is modeled with explicit schema choices and decoded values.

**Scale/Scope**: A handful of trusted self-hosted users. First providers are Claude Agent SDK and a deterministic conformance provider. Future providers may be SDK, CLI, hosted, local, ACP, or test providers if they satisfy the same contract.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Evidence Before Claims | PASS | Plan evidence comes from this spec, 003 overhaul, `backend-ts/`, `backend/vendor/effect-smol/`, NanoClaw provider/session sources, and official Claude Agent SDK docs. |
| II. Preserve Architecture Boundaries | PASS | Shared schemas/errors live in `domain-core`; HTTP/OpenAPI contracts stay in `api-core`; RPC protocol contracts stay in `rpc-core`; runtime handlers stay in `apps/api` and `apps/rpc`; provider adapters stay outside frontend and outside Python. |
| III. Design System Consistency | N/A | Frontend/UI is out of scope; no UI layout, copy system, tokens, or design surfaces are changed by this plan. |
| IV. Gates Travel With the Change | PASS | The plan names focused `@effect/vitest`, `HttpApiTest`, typecheck, Biome, deterministic conformance, and integration gates. |
| V. Reviewable, Incremental Delivery | PASS | First slice is contract plus Claude/deterministic proof. It does not include container runtime, secrets gateway, repo tokens, frontend redesign, or total Python removal. |

## Project Structure

### Documentation (this feature)

```text
specs/006-claude-agent-session-engine/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agent-provider-contract.md
│   ├── agent-session-api.md
│   ├── agent-session-rpc.md
│   ├── event-taxonomy.md
│   ├── paw-cli-surface.md
│   └── provider-conformance.md
└── tasks.md              # Created by /speckit-tasks, not by this plan
```

### Source Code (repository root)

```text
backend-ts/
├── packages/
│   ├── domain-core/                       # new neutral shared contract boundary
│   │   ├── package.json
│   │   └── src/
│   │       ├── Lib/
│   │       │   └── TypeIds.ts
│   │       └── Modules/
│   │           ├── Sessions/
│   │           │   ├── Domain.ts          # canonical session shape
│   │           │   └── Errors.ts
│   │           ├── AgentProviders/
│   │           │   ├── Domain.ts          # provider definitions, manifests, diagnostics
│   │           │   └── Errors.ts
│   │           └── AgentTurns/
│   │               ├── Domain.ts          # turns, events, provider sessions, bindings
│   │               └── Errors.ts
│   ├── harness/                          # new provider harness boundary
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── Provider/
│   │   │   │   ├── Contract.ts           # provider service/stream contract, imports public schemas from domain-core
│   │   │   │   ├── InternalDomain.ts     # provider-private decoded SDK/runtime payloads only
│   │   │   │   ├── Errors.ts             # Schema.TaggedErrorClass provider failures
│   │   │   │   ├── Service.ts            # Effect service contract for providers
│   │   │   │   ├── Registry.ts           # declarative provider registry
│   │   │   │   └── Conformance.ts        # shared provider conformance scenarios
│   │   │   ├── Providers/
│   │   │   │   ├── ClaudeAgentSdk.ts     # first real adapter
│   │   │   │   └── Deterministic.ts      # second proof and CI fixture
│   │   └── test/
│   │       ├── ClaudeAgentSdk.test.ts
│   │       ├── Deterministic.test.ts
│   │       └── Conformance.test.ts
│   ├── api-core/
│   │   └── src/Modules/
│   │       ├── Sessions/
│   │       │   └── Api.ts                # new canonical sessions HTTP group
│   │       ├── AgentProviders/
│   │       │   └── Api.ts                # HTTP/OpenAPI only
│   │       └── AgentTurns/
│   │           └── Api.ts                # HTTP/OpenAPI only
│   └── rpc-core/
│       └── src/Modules/
│           ├── AgentProviders/
│           │   └── RpcProtocol.ts        # Effect RPC protocol only
│           └── AgentTurns/
│               └── RpcProtocol.ts        # Effect RPC protocol only
└── apps/
    ├── api/
    │   └── src/Modules/
    │       ├── Sessions/            # new canonical session owner
    │       │   ├── Http.ts
    │       │   ├── Repo.ts
    │       │   └── Service.ts
    │       ├── AgentProviders/
    │       │   ├── Http.ts
    │       │   ├── Registry.ts
    │       │   └── Service.ts
    │       └── AgentTurns/
    │           ├── Http.ts
    │           ├── Repo.ts
    │           └── Service.ts
    └── rpc/
        └── src/Modules/
            ├── AgentProviders/
            │   └── Rpc.ts
            └── AgentTurns/
                └── Rpc.ts

packages/
└── paw-cli/
    └── src/Modules/
        └── Agent/
            ├── ProvidersCommand.ts       # `paw providers ...`
            └── SessionsCommand.ts        # `paw sessions send/events/cancel-turn ...`
```

**Structure Decision**: Add `backend-ts/packages/domain-core` for shared Effect Schema values and public tagged errors, `backend-ts/packages/api-core` for HTTP/OpenAPI contracts only, `backend-ts/packages/rpc-core` for Effect RPC protocols only, and `backend-ts/packages/harness` for provider lifecycle, adapters, registry, streaming, and conformance. `apps/api` owns HTTP handlers, repositories, and runtime composition. `apps/rpc` owns RPC handlers and transport wiring. `packages/paw-cli` owns the operator/test surface that calls the public HTTP/RPC surface. This follows the 003 thin-core direction while using the simpler Pawrrtal package name `harness`.

## Boundary Answers

- **Why `harness` is separate**: it is not "another API"; it is the provider harness library. It owns long-running provider lifecycle, SDK/CLI adapters, cancellation, follow-up input, event streams, continuation rotation, and conformance tests. Those concerns are reusable by `apps/api`, `apps/rpc`, `paw-cli`, and future worker/SDK surfaces. Keeping them out of `apps/api` prevents the HTTP server from becoming the provider abstraction.
- **Frontend/UI boundary**: frontend integration is out of scope for 006. Future frontend work must not import or call `harness`; it must consume normalized HTTP/RPC contracts. For this plan, acceptance is backend HTTP/RPC, provider conformance, and `paw`.
- **Where Effect RPC fits**: yes, Effect RPC makes sense for the internal/service transport, especially streaming turn events and future actor/worker boundaries. It should not be used merely to talk to a local package in the same process. The contract pattern is: public schemas/errors in `domain-core`, HTTP/OpenAPI in `api-core`, internal/streaming protocol in `rpc-core`, and host handlers in `apps/rpc/.../Rpc.ts`.
- **What `domain-core` owns**: public Effect Schema values, ids, branded values, and tagged errors that can be shared by HTTP, RPC, harness, services, tests, and CLI clients.
- **What `api-core` owns**: HTTP routes, OpenAPI annotations, generated HTTP-client shape, and root `Api`. It imports shared shapes from `domain-core` and must not define RPC protocols.
- **What `rpc-core` owns**: Effect RPC protocol groups and generated RPC-client shape. It imports shared shapes from `domain-core`; it must not import `api-core`.
- **What `apps/api` owns**: auth/profile scoping, HTTP handlers, repositories, storage transactions, provider registry composition, and conversion between API requests and provider harness calls.
- **What `apps/rpc` owns**: RPC handlers and protocol transport wiring for streaming/internal clients, using the `RpcProtocol.ts` groups from `rpc-core`.
- **What `paw-cli` owns**: operator-facing commands that exercise the feature without needing the frontend. It proves the API/RPC surface works from a real client and gives agents a scripted way to inspect providers, send a deterministic or Claude-backed message into a session, follow normalized events, and request cancellation.
- **How `paw sessions send` targets anything before agent management exists**: it targets a session, not an agent. Existing sessions carry their Workspace and selected provider binding. For a new session, the CLI must provide or resolve a Workspace and provider. There is no persistent agent registry in 006.
- **How Workspace is modeled**: Workspace is the Pawrrtal-owned agent home: instructions, memory, skills, tools, protocols, files, environment policy, plugin state, and capability settings. Sessions store `workspaceId`; provider turns materialize the current workspace state at turn start. Session history stores events/summaries/archives, not Workspace snapshots. Workspace preview and effective-context inspection are out of scope.
- **How the existing Conversations practice module changes**: it is removed or replaced by the new `Sessions` module. The old practice CRUD shape is useful only as implementation reference for Effect wiring/tests, not as the domain model. New shared `Session` schemas/errors live in `domain-core`; HTTP routes live in `api-core`/`apps/api`; agent-specific provider/capability/continuation state lives in `AgentSessionBinding` / `AgentTurns`.
- **What NanoClaw details we adopt**: provider handle shape, opaque continuation, follow-up push, abort, event stream, mandatory activity/liveness events, provider registry, session-invalid detection, continuation rotation, and the separation between agent-group workspace and per-session conversation state.
- **What NanoClaw details we defer**: container spawning, mount layout, two-SQLite host/container bridge, OneCLI gateway, per-agent filesystem isolation, and no-config posture.

## Phase 0 - Research

Research output is captured in [research.md](./research.md). Key resolved decisions:

1. Use NanoClaw's provider shape as the reference contract: `query(input)`, push follow-ups, end input, abort, event stream, opaque continuation, session-invalid detection, optional continuation rotation, and activity events.
2. Implement in Effect TS under `backend-ts`, not Python. Python is legacy behavior to interoperate with during migration, not the source model.
3. Prove provider neutrality with Claude Agent SDK plus a first-class deterministic provider before adding another real provider.
4. Use Effect Schema/Config/Stream/Layer as the first-class mechanics for validation, configuration, streaming, lifecycle, and tests.
5. Keep sandbox/container/secrets runtime details out of 006 except for a `workspaceId` reference, selected Workspace materialization status, and host-owned capability boundary.

## Phase 1 - Design & Contracts

- Data model: [data-model.md](./data-model.md)
- Provider contract: [contracts/agent-provider-contract.md](./contracts/agent-provider-contract.md)
- HTTP/API contract: [contracts/agent-session-api.md](./contracts/agent-session-api.md)
- RPC contract: [contracts/agent-session-rpc.md](./contracts/agent-session-rpc.md)
- Event taxonomy: [contracts/event-taxonomy.md](./contracts/event-taxonomy.md)
- Paw CLI surface: [contracts/paw-cli-surface.md](./contracts/paw-cli-surface.md)
- Conformance contract: [contracts/provider-conformance.md](./contracts/provider-conformance.md)
- Validation guide: [quickstart.md](./quickstart.md)

**Constitution re-check (post-design)**: PASS. The design narrows the feature to a reviewable provider-contract slice, keeps UI and sandbox/secrets work out of scope, and names the verification gates that must ship with implementation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| New `backend-ts/packages/harness` package | The provider contract must be reusable by the app runtime, conformance tests, and future CLI/SDK consumers without importing app handlers. This matches the 003 thin-core direction and the `effect-api-layout` harness role. | Putting providers directly in `apps/api` would make the app runtime the abstraction and repeat the Python coupling problem. |
| New `backend-ts/packages/domain-core` and `backend-ts/packages/rpc-core` packages | `api-core` is now deliberately HTTP/OpenAPI-only. Shared schemas/errors need a neutral owner, and RPC protocols need a contract package that does not import HTTP contracts. | Keeping `RpcProtocol.ts` and shared domain shapes in `api-core` would preserve the coupling the user explicitly rejected. |
| Replacing backend-ts `Conversations` with `Sessions` | NanoClaw's proven boundary is session-centered: routing, lifecycle, continuation, and provider ownership hang off a session, not a generic conversation CRUD object. Pawrrtal should use the same center of gravity. | Adapting the practice Conversations module would keep the wrong domain name and under-model provider execution. |
| Deterministic provider as second proof | A second real provider would force early provider-selection decisions that are outside 006. A deterministic provider still proves the public contract, event model, capability denials, cancellation, and continuation rules in CI. | Claude-only would not prove the abstraction. Mock-only tests would not prove a selectable provider can satisfy the contract. |

## Out Of Scope

- NanoClaw container spawn/mount model, OneCLI gateway, and per-agent filesystem isolation.
- Infisical or agent-vault secret brokering.
- Repo-token footprint reporting.
- Frontend redesign.
- Workspace preview, Workspace-diff inspection, or full effective-context inspection.
- Migrating all current Python session/conversation data or deleting Python runtime paths.
- Selecting the final actor/session persistence substrate for implementation beyond the repository ports required here.
