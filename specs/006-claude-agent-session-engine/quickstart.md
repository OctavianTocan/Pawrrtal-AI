# Quickstart: Agent Provider Session Engine

This guide validates the 006 implementation slice. Commands assume the repo root is `/mnt/work/code/personal/pawrrtal`.

## 1. Install and Align Dependencies

```bash
cd backend-ts
bun install
```

Implementation should first align `backend-ts` with the repo's current TypeScript 6 and latest compatible Effect v4 beta policy. Do not add the provider harness on top of stale Effect pins when `packages/paw-cli` or the root workspace has already moved ahead.

## 2. Contract Checks

```bash
cd backend-ts
bun run typecheck
bun run check
```

Current implementation note (2026-07-03): `bun run typecheck` passes for
`domain-core`, `api-core`, `rpc-core`, `harness`, `apps/api`, and `apps/rpc`.
`bun run check` passes for the `backend-ts` workspace. `bun run skill-gen:check`
also passes after regenerating the CLI/domain skills. US2-US6 source slices are
covered by typechecked tests for active runners, conformance, capabilities,
history maintenance, continuation rotation, and Workspace isolation. Focused Vitest commands
currently stall during runner startup or hit an esbuild service-stopped startup
error under `timeout`; behavior is covered by typechecked tests and direct
Effect/CLI smoke until the test runner startup issue is fixed.

Expected result:

- `@pawrrtal/api-core` compiles with `Sessions`, `AgentProviders`, and `AgentTurns` groups.
- `@pawrrtal/domain-core` compiles with shared `Sessions`, `AgentProviders`, and `AgentTurns` schemas/errors.
- `@pawrrtal/api-core` contains HTTP/OpenAPI groups only.
- `@pawrrtal/rpc-core` contains `RpcProtocol.ts` groups only.
- OpenAPI/Scalar still boots from the Effect HttpApi definition.

## 3. Provider Conformance

```bash
cd backend-ts
bun --bun vitest run packages/harness/test/ProviderConformance.test.ts packages/harness/test/EventNormalization.test.ts
```

Expected required result:

- deterministic provider passes manifest, simple turn, event normalization, continuation rotation, capability denial, and unsupported-capability scenarios;
- provider definition validation rejects incomplete event manifests before provider selection;
- `claude-agent-sdk` reports skipped/missing setup when credentials/runtime are not configured;
- Claude tests skip with an explicit reason when credentials/runtime are not available.

Current gate note (2026-07-03): the focused provider Vitest command exits under
the timeout guard with Vitest/esbuild startup failure instead of test failures:
`failed to load config ... The service was stopped`.

## 4. API Contract Tests

```bash
cd backend-ts
bun --bun vitest run apps/api/test/unit/Modules/AgentProviders/Http.test.ts apps/api/test/unit/Modules/AgentTurns/Http.test.ts
```

Expected result:

- `POST /api/v1/sessions` creates a session with Workspace/provider binding when provided;
- `GET /api/v1/agent-providers` returns decoded provider definitions;
- provider errors map to typed HTTP errors;
- turn creation returns a public `AgentTurnRead`;
- turn reads include redacted Workspace identity and materialization status only;
- event reads return only normalized `AgentProviderEventRead` values.

Current gate note (2026-07-03): the focused API Vitest command is blocked by
the same Vitest/esbuild startup failure. An in-process Effect smoke confirms
`AgentProvidersServiceLive` lists `deterministic` as `ready` and
`claude-agent-sdk` as `missingSetup`.

RPC contract tests must prove:

- RPC protocols import shared payloads from `domain-core`;
- `rpc-core` does not import `api-core`;
- event streaming returns normalized ordered events only.

## 5. Paw CLI Smoke

```bash
bun run paw-cli:check
./scripts/paw --backend-url http://127.0.0.1:8001 providers list --json
./scripts/paw --backend-url http://127.0.0.1:8001 sessions send <session-id> "Say hello" --json
./scripts/paw --backend-url http://127.0.0.1:8001 sessions events <session-id> <turn-id> --json
```

Expected result:

- provider list returns decoded provider readiness;
- deterministic turn reaches a terminal state;
- events are normalized and ordered;
- no frontend is required.

Current gate note (2026-07-03): `bun run --filter @pawrrtal/cli typecheck`
passes. Direct CLI smoke passes for root help and expected no-backend usage
errors:

```bash
cd packages/paw-cli
bun run src/Main.ts --help
bun run src/Main.ts providers list --json
```

The focused CLI Vitest command still times out at runner startup under
`timeout`. A manual fake-backend smoke using the real Bun CLI entrypoint passes
for `paw providers list --json`, `paw sessions send ... --json`, and
`paw sessions events ... --json`; a later smoke also passes for
`paw providers doctor deterministic --json` and
`paw sessions cancel-turn <session-id> <turn-id> --json`, including decoding the
new Workspace diagnostic field. Sandboxed port binding required elevated
execution for fake-backend smoke.

Cancellation smoke for the later active-runner slice:

```bash
./scripts/paw sessions cancel-turn <session-id> <turn-id> --reason "operator smoke" --json
```

Expected result:

- cancellation reaches `cancelled`, `failed`, or a declared unsupported result according to the provider manifest.

## 6. Local Runtime Smoke

When the implementation exposes the backend dev server:

```bash
cd backend-ts
bun run --filter '@pawrrtal/api' dev
```

Then validate:

- `/health` responds;
- `/api/v1/agent-providers` lists `deterministic` and `claude-agent-sdk`;
- `/docs` includes the generated provider and turn schemas;
- a deterministic turn reaches `complete`;
- a cancellation request reaches a terminal state.

## 7. Claude Smoke

Only run this when Claude Agent SDK credentials/runtime are configured.

Validation:

- provider readiness is `ready` or gives a typed setup error;
- simple Claude turn emits `turn.started`, activity/progress, `answer.completed`, and `turn.completed`;
- follow-up behavior matches the Claude manifest;
- cancellation or best-effort cancellation reaches a terminal state;
- stale continuation maps to a visible recovery result.

## 8. Full Repo Gate

Run when the implementation slice is ready for integration:

```bash
just check
```

If full repo checks fail outside touched surfaces, record the failure and run the focused gates above before asking for a separate cleanup decision.

Current gate note (2026-07-03): `UV_CACHE_DIR=/tmp/pawrrtal-uv-cache just check`
required elevated network access for `uv` to fetch Python build dependencies.
After Python checks passed, the repo gate failed in the frontend Biome pass on
out-of-scope existing frontend diagnostics, including `noJsxPropsBind` in
`frontend/app/dev/access-requests/AccessRequestsDevClient.tsx` and
`noLeakedRender` in `frontend/app/layout.tsx`.
