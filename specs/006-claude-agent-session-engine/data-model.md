# Data Model: Agent Provider Session Engine

## AgentProviderDefinition

Selectable provider identity and readiness metadata.

| Field | Meaning |
|---|---|
| `providerId` | Stable provider id, for example `claude-agent-sdk` or `deterministic`. |
| `displayName` | Human-readable provider name. |
| `kind` | `sdk`, `cli`, `hosted`, `local`, `deterministic`, or a later declared kind. |
| `version` | Provider adapter version or native runtime version when known. |
| `readiness` | `ready`, `degraded`, `missingSetup`, `unauthorized`, or `unavailable`. |
| `capabilities` | Provider capability manifest. |
| `continuation` | Continuation support summary. |
| `setupRequirements` | Required runtime, credentials, files, environment, or host services. |
| `diagnostics` | Redacted setup/readiness facts safe for operators. |

Rules:

- A provider without a decoded definition cannot be selected.
- Readiness must be cheap; it must not start a long-running agent turn.
- Diagnostics must not expose secrets or raw provider-native payloads.

## ProviderCapabilityManifest

Provider declaration of what Pawrrtal may ask it to do.

| Field | Meaning |
|---|---|
| `streaming` | Whether the provider emits visible streaming events. |
| `followUps` | `activeTurn`, `nextTurnOnly`, or `unsupported`. |
| `cancellation` | `native`, `bestEffort`, or `unsupported`. |
| `resume` | `native`, `rotationOnly`, or `unsupported`. |
| `nativeSlashCommands` | Whether raw slash commands can pass through. |
| `tools` | Supported tool categories and enforcement level. |
| `userQuestions` | `hostMediated`, `blocked`, or `unsupported`. |
| `workspaceInjection` | `systemPrompt`, `files`, `mcp`, `providerNative`, or `none`. |
| `eventTypes` | Event categories the provider may emit after normalization. |

Rules:

- Capability gaps must be visible before selection.
- Unsupported interactive affordances must fail or adapt through Pawrrtal flows; they must not hang a turn.
- Conformance tests must compare declared capabilities with observed behavior.

## Session

Durable user-visible interaction and execution thread, inspired by NanoClaw's session-centered routing model.

| Field | Meaning |
|---|---|
| `sessionId` | Pawrrtal session id. |
| `ownerId` | Profile/user owner. |
| `workspaceId` | Workspace whose instructions, memory, skills, files, env policy, and plugin state are visible to this session. |
| `title` | User-visible thread title. |
| `routeRef` | Optional source route such as web, Telegram, or future channel/thread binding. |
| `createdAt` / `updatedAt` | Audit timestamps. |

Rules:

- A Session is the canonical Pawrrtal thread/execution object.
- Every provider-backed Session belongs to exactly one Workspace.
- The existing backend-ts `Conversations` practice module is removed or replaced by this model.
- Provider/capability/continuation state lives in AgentSessionBinding.

## AgentSessionBinding

Provider/runtime binding for a Session executed by the agent provider engine.

| Field | Meaning |
|---|---|
| `sessionId` | Pawrrtal session id. |
| `selectedProviderId` | Provider selected for new turns. |
| `capabilityBoundaryId` | Host-approved capability policy for turns in this session. |
| `activeProviderSessionId` | Current provider-scoped continuation record when present. |
| `status` | `active`, `waiting`, `stale`, `failed`, `archived`, or `reset`. |
| `createdAt` / `updatedAt` | Audit timestamps. |

Rules:

- Backend HTTP/RPC/`paw` clients must not need provider-specific fields to inspect the session.
- A session has zero or one active AgentSessionBinding in this slice.
- Switching provider must create a new provider session unless an explicit migration path exists.

## SessionInvocationTarget

Routing input for starting a provider-backed turn before Pawrrtal has a persistent agent registry.

| Field | Meaning |
|---|---|
| `sessionId` | Existing session to continue, or omitted when creating a new session. |
| `workspaceId` | Required Workspace for a new session, or inherited from the existing session. |
| `providerId` | Explicit provider for a new session, or allowed override for an existing session. |
| `source` | Caller surface, such as `paw-cli`, HTTP API, RPC, or channel integration. |

Rules:

- A turn is valid when it has either an existing session with workspace/provider binding or a new-session request with workspace/provider resolved.
- `providerId` is the runtime/provider choice, not a durable agent identity.
- 006 does not create a persistent agent registry. That belongs to a later agent-management or Workspace-management spec.

## ProviderSessionRecord

Durable provider-scoped continuation state.

| Field | Meaning |
|---|---|
| `providerSessionId` | Pawrrtal id for this continuation record. |
| `sessionId` | Owning session. |
| `providerId` | Owning provider. |
| `nativeContinuationRef` | Redacted/opaque provider continuation reference. |
| `continuationFingerprint` | Stable diagnostic fingerprint, not the secret/token itself. |
| `resumeMode` | `native`, `rotationOnly`, or `unsupported`. |
| `status` | `active`, `rotated`, `stale`, `invalid`, or `closed`. |
| `lastActivityAt` | Last provider activity observed. |
| `rotationReason` | Reason a fresh provider session was started. |
| `invalidatedAt` | Timestamp when resume stopped being safe. |

Rules:

- Continuation is never shared across providers.
- If a provider marks a session invalid, the next turn starts fresh and emits a visible recovery event.
- Continuation storage must be treated as sensitive even when the value looks like a plain id.

## AgentTurn

One user-triggered unit of provider work.

| Field | Meaning |
|---|---|
| `turnId` | Stable turn id. |
| `sessionId` | Owning session. |
| `providerId` | Provider used for this turn. |
| `providerSessionId` | Provider session used or created for this turn. |
| `inputMessageId` | Source user message id. |
| `state` | `pending`, `running`, `waiting`, `complete`, `failed`, `cancelled`, or `stale`. |
| `sequence` | Monotonic order inside the session. |
| `lastProgressAt` | Last normalized activity/progress event time. |
| `failure` | Optional typed failure summary. |
| `createdAt` / `startedAt` / `finishedAt` | Lifecycle timestamps. |

Rules:

- There is at most one active running turn per session unless a later spec explicitly changes concurrency semantics.
- Follow-ups during an active turn are delivered to that turn when the provider supports active-turn input, otherwise queued visibly.
- Terminal states are distinct and queryable.

## AgentProviderEvent

Normalized event emitted during a turn.

| Field | Meaning |
|---|---|
| `eventId` | Stable event id. |
| `turnId` | Owning turn. |
| `sequence` | Monotonic sequence within the turn. |
| `type` | `turn.started`, `progress`, `activity`, `tool.started`, `tool.completed`, `tool.failed`, `capability.denied`, `diagnostic`, `continuation.rotated`, `error`, `answer.delta`, `answer.completed`, `turn.cancelled`, or `turn.completed`. |
| `visibility` | `user`, `operator`, or `internal`. |
| `payload` | Decoded event payload schema for the event type. |
| `createdAt` | Event timestamp. |

Rules:

- Every provider-native event that matters to users must map to one normalized event.
- Repeated activity events may update liveness without being displayed as prose.
- Native payloads may be stored only as redacted diagnostics after schema decoding.

## ProviderConformanceRun

Evidence that a provider satisfies the shared contract.

| Field | Meaning |
|---|---|
| `runId` | Conformance run id. |
| `providerId` | Tested provider. |
| `scenarioId` | Standard scenario name. |
| `result` | `passed`, `failed`, `skipped`, or `unsupportedDeclared`. |
| `observedCapabilities` | Capabilities demonstrated during the run. |
| `diagnostics` | Redacted failure details. |
| `createdAt` | Run timestamp. |

Rules:

- Claude and deterministic provider must pass the base conformance pack.
- Declared unsupported capabilities pass only when the denial/adaptation behavior is correct.

## Workspace

Long-lived Pawrrtal agent home used to materialize provider turn state.

| Field | Meaning |
|---|---|
| `workspaceId` | Stable Pawrrtal workspace id. |
| `name` | User-visible workspace name. |
| `slug` | Filesystem-safe workspace hint. |
| `pathRef` | Host-owned reference to the workspace root; ordinary clients do not receive raw unrestricted filesystem authority. |
| `promptFiles` | Root instruction files such as `AGENTS.md`, `SOUL.md`, `PREFERENCES.md`, and `USER.md`. |
| `agentBrainRef` | Reference to `.agent/` memory, skills, protocols, harness, and tools. |
| `envPolicyDigest` | Redacted digest of configured workspace env/secrets policy. |
| `pluginSnapshotDigest` | Digest of enabled workspace-local plugin/capability state. |

Rules:

- 006 passes `workspaceId` and decoded/redacted summaries only.
- Provider turns materialize effective instructions, skills, memory, tools, and policy from the Workspace.
- Workspace secrets and raw unrestricted paths are not exposed through public Session APIs.
- Workspace preview, mounts, secret injection, sandbox pathing, and full effective-context inspection belong to 008 or later specs.

## Storage Ports

First implementation stores data through runtime ports, not provider-native files leaking into API handlers.

| Port | Owner | Meaning |
|---|---|---|
| `AgentProviderRegistry` | `harness` / app composition | Lists registered providers and their decoded manifests. |
| `ProviderSessionRepo` | `apps/api` | Persists provider-scoped continuation records. |
| `AgentTurnRepo` | `apps/api` | Persists turn lifecycle state and sequencing. |
| `AgentEventRepo` | `apps/api` | Persists normalized turn events in order. |
| `ProviderConformanceRepo` | `apps/api` or test runtime | Stores latest conformance run summaries for diagnostics. |

Rules:

- `harness` may define service contracts for these ports, but `apps/api` supplies the concrete storage.
- Provider adapters do not write directly to public session storage.
- Public event records are normalized before persistence.

## Interaction Map

| System | Interaction |
|---|---|
| Sessions | Own the user-visible interaction/execution thread and route binding. |
| Agent provider engine | Runs turns, streams normalized events, handles provider continuation. |
| Domain core | Defines public schemas, ids, and tagged errors shared by HTTP, RPC, harness, tests, and CLI clients. |
| API core | Defines HTTP/OpenAPI route contracts and generated HTTP-client shape. |
| RPC core | Defines Effect RPC protocols and generated RPC-client shape. |
| API app runtime | Authenticates callers, persists sessions, turns, events, and provider-session records, invokes `harness`. |
| RPC app runtime | Serves Effect RPC protocols for streaming/internal clients and invokes `harness`. |
| Paw CLI | Calls API endpoints to inspect providers, start turns, follow events, and cancel work. |
| Future frontend/chat surfaces | Out of scope for 006; when added, they read normalized turn state and events through HTTP/RPC and never depend on provider-native payloads. |
| Workspace/sandbox runtime | Supplies materialized instructions, memory, skills, files, mounts, secrets, and sandbox boundaries; referenced by `workspaceId` in 006. |
