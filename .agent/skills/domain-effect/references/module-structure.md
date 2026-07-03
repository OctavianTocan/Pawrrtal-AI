# Module Structure

Use the current `backend-ts` layout, not comcom package paths.

```text
backend-ts/
├── packages/domain-core/src/
│   ├── Lib/
│   │   └── TypeIds.ts         shared id/branded value schemas
│   └── Modules/<Name>/
│       ├── Domain.ts          schemas, ids, readonly domain values
│       └── Errors.ts          public tagged errors
├── packages/api-core/src/
│   ├── Api.ts                 root HttpApi assembly
│   └── Modules/<Name>/
│       └── Api.ts             HttpApi group and endpoints
├── packages/rpc-core/src/
│   └── Modules/<Name>/
│       └── RpcProtocol.ts     Effect RPC protocol groups
├── packages/harness/src/
│   ├── Providers/
│   ├── Streams/
│   └── Conformance/
├── apps/api/src/
    ├── App.ts                 app assembly
    ├── Main.ts                runtime entrypoint
    ├── Infrastructure/        database, env, platform services
    └── Modules/<Name>/
        ├── Http.ts            handler wiring
        ├── Service.ts         business rules
        ├── Repo.ts            persistence
        └── Policy.ts          authz and request policy
└── apps/rpc/src/
    ├── App.ts                 RPC app assembly
    └── Modules/<Name>/
        └── Rpc.ts             RPC handler wiring
```

## File Roles

- `Domain.ts`: `Schema.Class`, ids, branded values, request/response shapes.
- `Errors.ts`: `Schema.TaggedError` values that are part of the public contract.
- `Api.ts`: endpoint declarations only.
- `RpcProtocol.ts`: RPC protocol declarations only.
- `Http.ts`: request boundary only. No state, no caches, no timers.
- `Rpc.ts`: RPC transport boundary only. No provider implementation details.
- `Service.ts`: business behavior and dependency use.
- `Repo.ts`: SQL/storage. Keep database row details here.
- `Policy.ts`: authz checks that are not pure schema validation.

Promote a helper to its own file only when it has a real name and multiple
callers. Do not create empty `Config.ts`, `Events.ts`, or `Helpers.ts` files
just because another module has them.

## Boundary Rules

- `domain-core` imports no app runtime, HTTP, RPC, harness, or storage code.
- `api-core` may import `domain-core`; it must not import `rpc-core`, `harness`,
  or app packages.
- `rpc-core` may import `domain-core`; it must not import `api-core`,
  `harness`, or app packages.
- `harness` may import `domain-core`; it must not import HTTP or RPC handlers.
- `apps/api` implements HTTP by importing `api-core`, `domain-core`, and the
  services/harness it composes.
- `apps/rpc` implements RPC by importing `rpc-core`, `domain-core`, and the
  services/harness it composes.
