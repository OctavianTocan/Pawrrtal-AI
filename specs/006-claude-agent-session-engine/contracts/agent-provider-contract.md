# Contract: Agent Provider Runtime

This contract defines the provider boundary below Pawrrtal sessions. It is inspired by NanoClaw's provider contract while staying independent of NanoClaw's container/session implementation.

## Provider Definition

A provider must expose a decoded `AgentProviderDefinition` before it can be selected:

- `providerId`
- `displayName`
- `kind`
- `version`
- `readiness`
- `capabilities`
- `continuation`
- `setupRequirements`
- redacted `diagnostics`

Provider definitions are Effect Schema values. Provider configuration is decoded through Effect Config and Schema. Hand-written unchecked objects are not acceptable as the source of truth.

Public provider, turn, event, and conformance schemas live in `@pawrrtal/domain-core`. `harness` imports those schemas for public values and defines only adapter-private schemas for native SDK/CLI payloads.

## Provider Service Shape

Language-level names may change during implementation, but the behavior must stay equivalent:

```text
AgentProvider
  describe: Effect<AgentProviderDefinition, ProviderSetupError>
  query(input: ProviderQueryInput): Effect<AgentQuery, ProviderStartError>
  isSessionInvalid(error: ProviderFailure): boolean
  maybeRotateContinuation(input: ContinuationRotationInput): Effect<ContinuationRotationDecision>
```

```text
AgentQuery
  push(message: FollowUpInput): Effect<void, ProviderInputError>
  endInput: Effect<void, ProviderInputError>
  events: Stream<AgentProviderEvent, ProviderFailure>
  abort(reason: CancellationReason): Effect<void, ProviderCancellationError>
```

Rules:

- `query` returns only after the provider has accepted the turn or failed with a typed provider error.
- `events` emits normalized Pawrrtal events, not provider-native messages.
- `push` is available only when the provider declares active-turn follow-ups.
- `abort` must either stop output or emit a typed best-effort cancellation result.

## Query Input

`ProviderQueryInput` includes:

- `turnId`
- `sessionId`
- `providerSessionId`
- `prompt`
- optional decoded follow-up backlog
- provider-scoped continuation reference
- `workspaceId`
- decoded Workspace summary for this turn
- `capabilityBoundaryRef`
- output/cancellation policy
- redacted diagnostics

Rules:

- Exactly one provider owns the input.
- Continuation references must match the selected provider id.
- The provider receives decoded Workspace/capability references, not arbitrary app objects.

## Event Taxonomy

Required normalized event names:

| Type | Meaning |
|---|---|
| `turn.started` | Provider accepted the turn and created or resumed provider continuation. |
| `progress` | User/operator-visible progress prose. |
| `activity` | Liveness signal. May be hidden from users but updates stuck-turn detection. |
| `tool.started` | Tool/action started. |
| `tool.completed` | Tool/action completed successfully. |
| `tool.failed` | Tool/action failed. |
| `capability.denied` | Host or provider denied a requested capability. |
| `diagnostic` | Redacted operator detail. |
| `continuation.rotated` | Provider/session continuation rotated or reset. |
| `error` | Recoverable or terminal typed provider failure. |
| `answer.delta` | Incremental assistant output. |
| `answer.completed` | Final assistant response or explicit no-response result. |
| `turn.cancelled` | Turn cancellation reached terminal state. |
| `turn.completed` | Turn reached normal terminal completion. |

Rules:

- Every long-running provider path must emit `activity` while it is making progress.
- `turn.completed`, `turn.cancelled`, and terminal `error` end a turn.
- Event payloads are per-type Schema classes with annotations useful to HTTP/OpenAPI, RPC docs, CLI output, and generated skills.

## Continuation Rules

- Continuation is opaque outside the provider adapter and storage boundary.
- A provider session record always includes `providerId`.
- A provider switch starts a new provider session unless an explicit migration provider is implemented.
- `maybeRotateContinuation` may archive/summarize before requesting a fresh session.
- `isSessionInvalid` maps provider-native stale/missing-session failures into Pawrrtal stale-session recovery.

## Capability Rules

Provider capabilities must declare:

- follow-up support
- cancellation support
- resume/continuation support
- native slash-command support
- tool enforcement level
- user-question behavior
- Workspace injection modes
- unsupported interactive affordances

If a capability is unsupported, the provider must either adapt it through Pawrrtal's host flow or fail with `CapabilityDeniedError`. Silent hangs are contract failures.

## Error Rules

Errors are Effect Schema tagged errors. Required categories:

- `ProviderSetupError`
- `ProviderStartError`
- `ProviderInputError`
- `ProviderStreamError`
- `ProviderCancellationError`
- `ProviderContinuationError`
- `ProviderCapabilityError`
- `ProviderContractError`
- `ProviderRateLimitError`
- `ProviderAuthError`

Provider-native errors are decoded into these types at the adapter boundary.

## Dependency Rules

- `domain-core` must not import `api-core`, `rpc-core`, `harness`, or app packages.
- `api-core` must not import `rpc-core` or `harness`.
- `rpc-core` must not import `api-core` or `harness`.
- `harness` may import public schemas/errors from `domain-core`.
- `apps/api` may import `domain-core`, `api-core`, and `harness`.
- `apps/rpc` may import `domain-core`, `rpc-core`, and `harness`.
- `packages/paw-cli` calls public HTTP/RPC client surfaces; it does not reach into provider adapters for normal operation.
- Frontend integration is out of scope for 006; future frontend code must not import `harness`.

## Claude Provider Requirements

The Claude Agent SDK adapter must:

- use the official TypeScript SDK as the real provider boundary;
- support streaming input when active-turn follow-ups are enabled;
- map SDK init/result/progress/tool/error/session events into normalized events;
- block or adapt unsupported headless affordances;
- expose readiness diagnostics for SDK package/runtime, auth, model, and executable path;
- support resume when the SDK session can resume;
- detect stale session failures and emit recovery decisions;
- treat transcript/continuation rotation as provider-scoped maintenance.

## Deterministic Provider Requirements

The deterministic provider must:

- be selectable through the same registry;
- expose a full provider definition;
- emit the base event sequence deterministically;
- support configured success, cancellation, capability denial, stale continuation, and failure scenarios;
- be the CI-safe provider for conformance and contract tests.
