# backend-ts conventions

How we lay out Effect TS backend. One section per file role. More sections later.

**Packages**

| Package | Path | Job |
|---------|------|-----|
| Domain contracts | `packages/domain-core/` | Transport-neutral schemas, branded ids, and tagged public errors. No HTTP, RPC, DB, or provider runtime. |
| HTTP/OpenAPI contracts | `packages/api-core/` | `HttpApi` groups, endpoint declarations, OpenAPI annotations, and root API composition. |
| RPC contracts | `packages/rpc-core/` | Effect RPC protocol declarations. Imports shared shapes from `domain-core`, never from `api-core`. |
| Provider harness | `packages/harness/` | Provider adapter contract, registry, normalized streams, conformance, cancellation, and continuation behavior. |
| HTTP runtime | `apps/api/` | HTTP handlers, services, repos, auth, app layers, and `Main.ts`. |
| RPC runtime | `apps/rpc/` | RPC handlers and runtime layer composition. |

Shape like `backend/vendor/comcom`. Effect v4 from `backend/vendor/effect-smol` (`ai-docs/`). Not comcom v3 `@effect/platform` imports.

For 006 and newer work, `api-core` means HTTP/OpenAPI only. Put shared
schema/error values in `domain-core`, provider execution behavior in `harness`,
and RPC declarations in `rpc-core`.

---

## `Domain.ts` (domain-core)

**Job**

Data shapes for one feature: IDs, response entities, create/update bodies,
capability manifests, normalized events, and public errors. All values are
Effect `Schema`. The same schemas are imported by `Api.ts`, RPC protocols,
handlers, services, harness adapters, CLI consumers, and tests.

**Why "domain"**

DDD name. Business *what data looks like* — not HTTP, not SQL, not workflow. Empty name -> `Untitled Project` lives in `Service.ts` (`apps/api`), not here.

**Path**

```text
packages/domain-core/src/Modules/<Feature>/Domain.ts
```

Existing legacy modules may still live in `api-core`, but new provider-session
work uses `domain-core`.

**Put here**

| Kind | Job | Name hint |
|------|-----|-----------|
| ID schema | Identifier type | `ProjectId` |
| Entity | API response object | `Project` |
| Create body | POST payload | `ProjectCreate` |
| Update body | PATCH payload | `ProjectUpdate` |
| Enums | Fixed values | `SessionStatus` |

`Schema.Class` for objects. Use `.annotate({ description: "..." })` on fields
and top-level schemas when OpenAPI, RPC, generated docs, or agents need docs.

**Not here**

- HTTP method/path/status -> `Api.ts` in `api-core`
- `ProjectNotFoundError` etc -> `Errors.ts`
- SQL -> `Repo.ts` (`apps/api`)
- Auth -> `Policy.ts` (`apps/api`)

**Siblings**

```text
Domain.ts  -> WHAT (Project, ProjectCreate, ProjectId)
Errors.ts  -> fail modes (404, 409)
Api.ts     -> WHERE on wire (GET /, POST /, :id)
```

`Api.ts` pulls shared types:

```typescript
.addSuccess(Project)
.setPayload(ProjectCreate)
```

`Service.ts` / `Repo.ts` import same types for row -> response mapping.

**006 session engine**

Use `Sessions`, `AgentProviders`, and `AgentTurns`; do not add new provider
execution behavior to the old backend-ts `Conversations` practice module.

---

## `Api.ts` (api-core)

**Job**

HTTP *contract* for one feature: which routes exist, method, path, success type, body, path params, errors. `HttpApiGroup` + `HttpApiEndpoint`. OpenAPI comes from this + `Domain.ts`. **No handler impl** — that is `Http.ts` in `apps/api`.

**Two files named Api.ts**

| File | Job |
|------|-----|
| `Modules/<Feature>/Api.ts` | One route group (`ProjectsApi`, `SystemApi`) |
| `packages/api-core/src/Api.ts` | Root: `.add()` every group, global `/v1` prefix, API title |

**Feature group path**

```text
packages/api-core/src/Modules/<Feature>/Api.ts
```

Export `class ProjectsApi extends HttpApiGroup.make('projects')` (example).

**Group id string**

First arg to `HttpApiGroup.make('projects')` **must match** `HttpApiBuilder.group(Api, 'projects', ...)` in `apps/api/Modules/<Feature>/Http.ts`. Mismatch = handler never wires.

**Typical endpoint chain**

```typescript
HttpApiEndpoint.get('list', '/')
  .addSuccess(Project)           // or array / paginated wrapper
  .addError(ProjectNotFoundError) // from Errors.ts
  .setPath(Schema.Struct({ id: ProjectId }))  // when :id in path
  .setPayload(ProjectCreate)     // POST/PATCH body from Domain.ts
  .annotate(OpenApi.Summary, '...')
```

Methods: `get` | `post` | `patch` | `del`. First string = endpoint name (used in handler map). Second = path **under group prefix**.

**Group-level knobs**

- `.prefix('/projects')` — all endpoints under `/projects` (root `Api` also has `.prefix('/v1')` -> `/v1/projects/...`)
- `.addError(...)` — errors shared by whole group
- `.middleware(...)` — comcom adds auth on group; Pawrrtal may do same later
- `{ topLevel: true }` on group — skip nesting under `/v1` for that group (see `SystemApi` `/health`)

**Root `Api.ts`**

```typescript
export class Api extends HttpApi.make('api')
  .add(SystemApi)
  .add(ProjectsApi)   // each feature group
  .prefix('/v1')
  .annotate(OpenApi.Title, 'Pawrrtal API')
```

New feature: add group here + export from `packages/api-core/src/index.ts`.

**Not here**

- `Effect` that talks to DB -> `Service.ts` / `Repo.ts`
- `HttpApiBuilder.group` handler bodies -> `Http.ts`
- Business rules -> `Service.ts`

**Siblings**

```text
Domain.ts  -> types endpoints reference
Errors.ts  -> .addError(...) targets
Api.ts     -> route table + OpenAPI
Http.ts    -> (apps/api) wire handlers to group id
```

**Python**

Not 1:1 file. Python splits `schemas.py` (Domain) vs `router.py` + `APIRouter` paths (Api). When porting route, read Python router for method/path, schemas for payloads, encode both in `Api.ts`.

**Parity note**

Match Python surface. e.g. projects today: list/create/patch/delete — **no GET by id**. Do not add endpoint in `Api.ts` until product wants it.

---

## Later

- `Errors.ts`
- `Http.ts` (`Http<Feature>Live`)
- `Service.ts`, `Repo.ts`, `Policy.ts`
- `Modules/Layers.ts`
