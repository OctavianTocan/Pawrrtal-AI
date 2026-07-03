# RPC And Shared Contracts

Pawrrtal keeps transport-neutral schemas separate from transport contracts.

## Package Roles

| Package | Role |
| --- | --- |
| `packages/domain-core` | Shared Effect Schema values, ids, branded values, and public tagged errors. |
| `packages/api-core` | HTTP/OpenAPI contract through `HttpApi` groups and root `Api`. |
| `packages/rpc-core` | Effect RPC protocol contract through `RpcProtocol.ts` groups. |
| `apps/api` | HTTP handlers and server composition. |
| `apps/rpc` | RPC handlers and protocol transport composition. |

## Import Direction

```text
domain-core
  ^        ^
  |        |
api-core  rpc-core
  ^        ^
  |        |
apps/api  apps/rpc
```

`harness` may import `domain-core` when it needs public provider, turn, event,
or error shapes. It should not import `api-core` or `rpc-core` just to call a
local service.

## Rules

- Put shared schemas/errors in `domain-core`.
- Put `HttpApi` endpoint declarations in `api-core`.
- Put Effect RPC protocol declarations in `rpc-core`.
- Put HTTP handlers in `apps/api/src/Modules/<Name>/Http.ts`.
- Put RPC handlers in `apps/rpc/src/Modules/<Name>/Rpc.ts`.
- Do not make `rpc-core` import `api-core`; if both transports need a shape,
  move that shape to `domain-core`.
- Do not use RPC to call a local package in the same process. Use an Effect
  service/layer call for local composition and reserve RPC for transport,
  streaming, actor, worker, or remote client boundaries.
