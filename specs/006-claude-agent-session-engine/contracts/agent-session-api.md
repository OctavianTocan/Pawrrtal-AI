# Contract: Agent Session API

The HTTP API contract exposes provider definitions, provider diagnostics, and agent turn lifecycle through `@pawrrtal/api-core` HttpApi groups. OpenAPI is generated from Effect HttpApi and Schema annotations; it is not hand-written.

## Consumers

- `paw-cli` consumes this API for operator smoke and deterministic provider runs.
- `apps/api` implements HTTP routes and calls `harness` internally.
- `harness` does not expose HTTP routes.
- Frontend/chat surfaces are out of scope for 006; future frontend work must consume this API or RPC and must not import `harness`.

Shared request/response schemas and public tagged errors live in `@pawrrtal/domain-core`. RPC protocols are defined separately in `@pawrrtal/rpc-core`; this file is HTTP/OpenAPI only.

## API Groups

### `SessionsApi`

Prefix: `/sessions`

Endpoints:

| Endpoint | Method/Path | Purpose |
|---|---|---|
| `list` | `GET /` | List sessions visible to the caller. |
| `create` | `POST /` | Create a session with required workspace and optional provider binding. |
| `get` | `GET /:session_id` | Read one session and visible lifecycle summary. |
| `update` | `PATCH /:session_id` | Update session metadata such as title or route summary. |
| `remove` | `DELETE /:session_id` | Remove or archive a session according to retention policy. |

Errors:

- `SessionNotFoundError` (`404`)
- `SessionConflictError` (`409`)

### `AgentProvidersApi`

Prefix: `/agent-providers`

Endpoints:

| Endpoint | Method/Path | Purpose |
|---|---|---|
| `list` | `GET /` | List selectable providers and readiness summaries. |
| `get` | `GET /:provider_id` | Read one provider definition and diagnostics. |
| `conformance` | `GET /:provider_id/conformance` | Read latest conformance results. |

Errors:

- `ProviderNotFoundError` (`404`)
- `ProviderUnavailableError` (`503`)
- `ProviderContractError` (`422`)

### `AgentTurnsApi`

Prefix: `/sessions/:session_id/agent-turns`

Endpoints:

| Endpoint | Method/Path | Purpose |
|---|---|---|
| `create` | `POST /` | Start or queue an agent turn for a session. |
| `list` | `GET /` | List turns for a session. |
| `get` | `GET /:turn_id` | Read current turn state and diagnostics. |
| `events` | `GET /:turn_id/events` | Read normalized events emitted so far. |
| `followUp` | `POST /:turn_id/follow-ups` | Send a follow-up to the active turn or queue visibly. |
| `cancel` | `POST /:turn_id/cancel` | Request cancellation. |
| `resetSession` | `POST /provider-session/reset` | Reset the provider-scoped continuation for the session. |

Errors:

- `SessionNotFoundError` (`404`)
- `AgentTurnNotFoundError` (`404`)
- `AgentTurnConflictError` (`409`)
- `ProviderNotReadyError` (`503`)
- `CapabilityDeniedError` (`403`)
- `ProviderContractError` (`422`)

## Wire Shapes

All request and response bodies are Effect Schema classes in `packages/domain-core/src/Modules/*/Domain.ts`.

Required response shapes:

- `AgentProviderRead`
- `AgentProviderCapabilityRead`
- `AgentProviderSetupRequirementRead`
- `ProviderConformanceResultRead`
- `SessionRead`
- `SessionCreateInput`
- `SessionUpdateInput`
- `SessionInvocationInput`
- `AgentTurnRead`
- `AgentTurnCreateInput`
- `AgentFollowUpInput`
- `AgentCancellationInput`
- `AgentProviderEventRead`
- `ProviderSessionRead`

## OpenAPI Requirements

- Each public schema has an identifier and useful field descriptions.
- Each endpoint has `OpenApi.Summary` and `OpenApi.Description`.
- Provider events use discriminated schemas so generated clients can branch on event type.
- Redacted diagnostic fields are named as redacted or digest fields.

## Stream Contract

First implementation may expose events by polling `GET /events` if the backend-ts streaming transport is not ready. The domain contract must still model events as an ordered stream so later RPC/WebSocket work can reuse the same event shape.

Rules:

- Event ordering is monotonic per turn.
- Re-fetching events with the last sequence must be idempotent.
- A terminal event marks the turn terminal.
- Clients receive only normalized events.

## Provider Selection Rules

Turn creation accepts a session invocation target:

- existing `sessionId`, which carries workspace/provider binding; or
- new-session request with `workspaceId` and `providerId` resolved.

Turn creation may accept explicit `providerId` as an override when allowed. Omitted provider id means use the existing session default provider.

Rules:

- Missing workspace/provider resolution yields validation failure.
- Missing or unavailable provider yields `ProviderNotReadyError`.
- Provider contract failure yields `ProviderContractError`.
- Provider switches must not reuse prior provider continuation.

## State Rules

Public turn states are exactly:

- `pending`
- `running`
- `waiting`
- `complete`
- `failed`
- `cancelled`
- `stale`

No additional provider-native state names may leak into public responses.
