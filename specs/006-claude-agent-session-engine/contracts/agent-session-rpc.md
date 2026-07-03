# Contract: Agent Session RPC

The RPC contract exposes streaming/internal provider and turn operations through `@pawrrtal/rpc-core`. It is separate from `@pawrrtal/api-core`, which is HTTP/OpenAPI only.

## Consumers

- `apps/rpc` implements RPC handlers and calls `harness` internally.
- `paw-cli` may consume RPC clients for streaming/follow operations when the HTTP polling surface is insufficient.
- Future worker, actor, or SDK clients may consume this contract.
- `harness` does not expose RPC routes.
- Frontend/chat surfaces are out of scope for 006; future frontend work may consume generated RPC clients only when a later app slice explicitly wires that transport.

Shared request/response schemas and public tagged errors live in `@pawrrtal/domain-core`.

## RPC Groups

`rpc-core` defines `RpcProtocol.ts` groups for streaming/internal calls:

- `agentProviders.list`
- `agentProviders.doctor`
- `agentTurns.start`
- `agentTurns.events`
- `agentTurns.followUp`
- `agentTurns.cancel`

## Rules

- RPC payloads use `domain-core` schemas, not locally duplicated shapes.
- `rpc-core` must not import `api-core`.
- `api-core` must not import `rpc-core`.
- RPC handlers live in `apps/rpc/src/Modules/*/Rpc.ts`.
- RPC is used for transport boundaries and streaming; in-process app calls to `harness` remain Effect service calls.
- RPC must not expose provider-native payloads by default; it streams normalized `AgentProviderEventRead` values.
- Event ordering is monotonic per turn.
- Terminal events end the RPC event stream unless a caller explicitly requests historical replay.
