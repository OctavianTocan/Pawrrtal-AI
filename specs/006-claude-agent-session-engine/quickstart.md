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

Expected result:

- `@pawrrtal/api-core` compiles with `Sessions`, `AgentProviders`, and `AgentTurns` groups.
- `@pawrrtal/domain-core` compiles with shared `Sessions`, `AgentProviders`, and `AgentTurns` schemas/errors.
- `@pawrrtal/api-core` contains HTTP/OpenAPI groups only.
- `@pawrrtal/rpc-core` contains `RpcProtocol.ts` groups only.
- OpenAPI/Scalar still boots from the Effect HttpApi definition.

## 3. Provider Conformance

```bash
cd backend-ts
bun run test -- agent-provider
```

Expected required result:

- deterministic provider passes manifest, simple turn, follow-up, cancellation, stale continuation, capability denial, provider switch, and event normalization scenarios;
- Claude Agent SDK conformance runs when credentials/runtime are available;
- Claude tests skip with an explicit reason when credentials/runtime are not available.

## 4. API Contract Tests

```bash
cd backend-ts
bun run test -- Sessions AgentProviders AgentTurns
```

Expected result:

- `POST /api/v1/sessions` creates a session with Workspace/provider binding when provided;
- `GET /api/v1/agent-providers` returns decoded provider definitions;
- provider errors map to typed HTTP errors;
- turn creation returns a public `AgentTurnRead`;
- event reads return only normalized `AgentProviderEventRead` values.

RPC contract tests must prove:

- RPC protocols import shared payloads from `domain-core`;
- `rpc-core` does not import `api-core`;
- event streaming returns normalized ordered events only.

## 5. Paw CLI Smoke

```bash
bun run paw-cli:check
./scripts/paw providers list --json
./scripts/paw providers doctor deterministic --json
./scripts/paw sessions send --provider deterministic --workspace <workspace-id-or-slug> --message "Say hello" --json
./scripts/paw sessions send --session <session-id> --message "Continue" --json
./scripts/paw sessions events <session-id> --turn <turn-id> --follow --json
```

Expected result:

- provider list returns decoded provider readiness;
- deterministic provider doctor passes;
- deterministic turn reaches a terminal state;
- events are normalized and ordered;
- no frontend is required.

Cancellation smoke:

```bash
./scripts/paw sessions cancel-turn <session-id> --turn <turn-id> --reason "operator smoke" --json
```

Expected result:

- cancellation reaches `cancelled`, `failed`, or a declared unsupported result according to the provider manifest.

## 6. Local Runtime Smoke

When the implementation exposes the backend dev server:

```bash
cd backend-ts
bun run --filter '@pawrrtal/api' start
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
