# Tasks: Agent Provider Session Engine

**Input**: Design documents from `specs/006-claude-agent-session-engine/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. This feature changes backend session execution, provider contracts, public HTTP/RPC contracts, and the `paw` operator surface. Write the focused tests in each story before implementation and confirm they fail for the missing behavior.

**Organization**: Tasks are grouped by user story so the provider session engine can be implemented in independently testable increments. No frontend/UI tasks are included.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the backend-ts toolchain and create the package/app boundaries required by the plan.

- [ ] T001 Align backend-ts to TypeScript 6 and the latest compatible Effect v4 beta, including `@anthropic-ai/claude-agent-sdk`, in `backend-ts/package.json`
- [ ] T002 Refresh the backend-ts dependency lock after package alignment in `backend-ts/bun.lock`
- [ ] T003 [P] Create the shared domain package boundary in `backend-ts/packages/domain-core/package.json` and `backend-ts/packages/domain-core/tsconfig.json`
- [ ] T004 [P] Create the Effect RPC contract package boundary in `backend-ts/packages/rpc-core/package.json` and `backend-ts/packages/rpc-core/tsconfig.json`
- [ ] T005 [P] Create the provider harness package boundary in `backend-ts/packages/harness/package.json` and `backend-ts/packages/harness/tsconfig.json`
- [ ] T006 [P] Create the RPC app boundary in `backend-ts/apps/rpc/package.json` and `backend-ts/apps/rpc/tsconfig.json`
- [ ] T007 Add new workspace dependencies to the HTTP app and HTTP contract packages in `backend-ts/apps/api/package.json` and `backend-ts/packages/api-core/package.json`
- [ ] T008 Tighten backend-ts TypeScript/Vitest wiring for the new packages in `backend-ts/tsconfig.base.json`, `backend-ts/vitest.config.ts`, and `backend-ts/vitest.shared.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared public shapes, errors, and dependency boundaries that every story depends on.

**Critical**: No user story work should begin until this phase is complete.

- [ ] T009 [P] Define shared branded ids and TypeIds for sessions, turns, providers, provider sessions, workspaces, and events in `backend-ts/packages/domain-core/src/Lib/TypeIds.ts`
- [ ] T010 [P] Define public Session schemas and tagged errors in `backend-ts/packages/domain-core/src/Modules/Sessions/Domain.ts` and `backend-ts/packages/domain-core/src/Modules/Sessions/Errors.ts`
- [ ] T011 [P] Define public AgentProvider schemas and tagged errors in `backend-ts/packages/domain-core/src/Modules/AgentProviders/Domain.ts` and `backend-ts/packages/domain-core/src/Modules/AgentProviders/Errors.ts`
- [ ] T012 [P] Define public AgentTurn, ProviderSession, normalized event, and capability-boundary schemas and tagged errors in `backend-ts/packages/domain-core/src/Modules/AgentTurns/Domain.ts` and `backend-ts/packages/domain-core/src/Modules/AgentTurns/Errors.ts`
- [ ] T013 [P] Export the domain-core public modules from `backend-ts/packages/domain-core/src/index.ts`
- [ ] T014 [P] Add schema annotation and docstring coverage for public domain values in `backend-ts/packages/domain-core/test/SchemaAnnotations.test.ts`
- [ ] T015 Add dependency-boundary tests for `domain-core`, `api-core`, `rpc-core`, `harness`, `apps/api`, and `apps/rpc` in `backend-ts/apps/api/test/unit/Boundaries/PackageBoundaries.test.ts`

**Checkpoint**: Shared schemas/errors and package boundaries are ready; story implementation can now begin.

---

## Phase 3: User Story 1 - Sessions Run Through a Pluggable Agent Provider (Priority: P1) MVP

**Goal**: Start and observe provider-backed sessions through one provider-neutral contract, with Claude as the first real provider and a deterministic provider as the CI-safe second proof.

**Independent Test**: Start a new deterministic provider session through HTTP or `paw`, read ordered normalized events through the public surface, send a follow-up to the same session, and confirm the final state does not depend on provider-native payloads. Run the same conformance path against Claude when credentials/runtime are available.

### Tests for User Story 1

- [ ] T016 [P] [US1] Add base provider conformance tests for manifest decode, simple turn, and deterministic provider success in `backend-ts/packages/harness/test/ProviderConformance.test.ts`
- [ ] T017 [P] [US1] Add normalized event mapping tests for the canonical event taxonomy in `backend-ts/packages/harness/test/EventNormalization.test.ts`
- [ ] T018 [P] [US1] Add provider HTTP contract tests for list, get, and conformance reads in `backend-ts/apps/api/test/unit/Modules/AgentProviders/Http.test.ts`
- [ ] T019 [P] [US1] Add session and turn HTTP contract tests for create, send, events, and normalized output in `backend-ts/apps/api/test/unit/Modules/AgentTurns/Http.test.ts`
- [ ] T020 [P] [US1] Add `paw providers` and `paw sessions send/events` integration tests against the deterministic provider in `packages/paw-cli/test/integration/agent-session-engine.test.ts`

### Implementation for User Story 1

- [ ] T021 [US1] Implement the provider and query service contracts in `backend-ts/packages/harness/src/Provider/Contract.ts` and `backend-ts/packages/harness/src/Provider/Service.ts`
- [ ] T022 [US1] Implement provider-private decoded payload schemas and Effect tagged provider errors in `backend-ts/packages/harness/src/Provider/InternalDomain.ts` and `backend-ts/packages/harness/src/Provider/Errors.ts`
- [ ] T023 [US1] Implement the first selectable deterministic provider success path in `backend-ts/packages/harness/src/Providers/Deterministic.ts`
- [ ] T024 [US1] Implement the initial Claude Agent SDK adapter and normalized event mapping in `backend-ts/packages/harness/src/Providers/ClaudeAgentSdk.ts`
- [ ] T025 [US1] Implement the provider registry and Effect Config decoding for provider setup in `backend-ts/packages/harness/src/Provider/Registry.ts` and `backend-ts/packages/harness/src/Provider/Config.ts`
- [ ] T026 [US1] Add HTTP/OpenAPI-only contract groups for sessions, providers, and turns in `backend-ts/packages/api-core/src/Modules/Sessions/Api.ts`, `backend-ts/packages/api-core/src/Modules/AgentProviders/Api.ts`, and `backend-ts/packages/api-core/src/Modules/AgentTurns/Api.ts`
- [ ] T027 [US1] Register the new HTTP groups and exports in `backend-ts/packages/api-core/src/Api.ts` and `backend-ts/packages/api-core/src/index.ts`
- [ ] T028 [US1] Implement session repository and business service behavior in `backend-ts/apps/api/src/Modules/Sessions/Repo.ts` and `backend-ts/apps/api/src/Modules/Sessions/Service.ts`
- [ ] T029 [US1] Implement provider registry composition and readiness service behavior in `backend-ts/apps/api/src/Modules/AgentProviders/Registry.ts` and `backend-ts/apps/api/src/Modules/AgentProviders/Service.ts`
- [ ] T030 [US1] Implement turn, provider-session, and event repository/service behavior in `backend-ts/apps/api/src/Modules/AgentTurns/Repo.ts` and `backend-ts/apps/api/src/Modules/AgentTurns/Service.ts`
- [ ] T031 [US1] Implement HTTP handlers for sessions, providers, and turns in `backend-ts/apps/api/src/Modules/Sessions/Http.ts`, `backend-ts/apps/api/src/Modules/AgentProviders/Http.ts`, and `backend-ts/apps/api/src/Modules/AgentTurns/Http.ts`
- [ ] T032 [US1] Define Effect RPC protocols for provider and turn operations in `backend-ts/packages/rpc-core/src/Modules/AgentProviders/RpcProtocol.ts` and `backend-ts/packages/rpc-core/src/Modules/AgentTurns/RpcProtocol.ts`
- [ ] T033 [US1] Implement RPC handlers for provider and turn operations in `backend-ts/apps/rpc/src/Modules/AgentProviders/Rpc.ts` and `backend-ts/apps/rpc/src/Modules/AgentTurns/Rpc.ts`
- [ ] T034 [US1] Add the `paw` HTTP/RPC client helper for agent-session commands in `packages/paw-cli/src/Modules/Agent/ApiClient.ts`
- [ ] T035 [US1] Implement `paw providers list` and register it in `packages/paw-cli/src/Modules/Agent/ProvidersCommand.ts` and `packages/paw-cli/src/Commands.ts`
- [ ] T036 [US1] Implement `paw sessions send` and `paw sessions events` and register them in `packages/paw-cli/src/Modules/Agent/SessionsCommand.ts` and `packages/paw-cli/src/Commands.ts`
- [ ] T037 [US1] Remove or replace the practice Conversations module from the active Sessions path in `backend-ts/packages/api-core/src/Modules/Conversations/`, `backend-ts/apps/api/src/Modules/Conversations/`, and `backend-ts/apps/api/test/unit/Modules/Conversations/`

**Checkpoint**: US1 is functional through backend HTTP/RPC and `paw`, with deterministic provider proof and Claude smoke when available.

---

## Phase 4: User Story 2 - Follow-Ups, Interruptions, and Recovery Are First-Class (Priority: P1)

**Goal**: Keep one active provider query per session runner, push ordinary follow-ups into that query, abort active queries for runner/admin commands, and recover pending or running work after restart with visible states.

**Independent Test**: Start a long deterministic turn, push a follow-up during the active turn, cancel another turn, and simulate restart recovery. Confirm ordered delivery, no duplicate competing turns, terminal cancellation, and visible recoverable failure or resume.

### Tests for User Story 2

- [ ] T038 [P] [US2] Add active-query, follow-up ordering, and admin-interruption tests in `backend-ts/packages/harness/test/SessionRunner.test.ts`
- [ ] T039 [P] [US2] Add pending/running restart recovery and stale-state tests in `backend-ts/apps/api/test/unit/Modules/AgentTurns/Recovery.test.ts`
- [ ] T040 [P] [US2] Add `paw sessions events --follow` and `paw sessions cancel-turn` integration tests in `packages/paw-cli/test/integration/agent-turn-controls.test.ts`

### Implementation for User Story 2

- [ ] T041 [US2] Implement the NanoClaw-style active provider query loop in `backend-ts/packages/harness/src/Runtime/SessionRunner.ts`
- [ ] T042 [US2] Implement ordinary follow-up and runner/admin command queue semantics in `backend-ts/packages/harness/src/Runtime/TurnInputQueue.ts`
- [ ] T043 [US2] Implement provider cancellation and terminal-output suppression rules in `backend-ts/packages/harness/src/Runtime/Cancellation.ts`
- [ ] T044 [US2] Implement pending, running, waiting, failed, cancelled, complete, and stale recovery transitions in `backend-ts/apps/api/src/Modules/AgentTurns/Recovery.ts`
- [ ] T045 [US2] Extend the `paw` sessions command group with follow, cancellation, and resulting-state output in `packages/paw-cli/src/Modules/Agent/SessionsCommand.ts`

**Checkpoint**: US2 can be tested without UI by using deterministic provider scripts and `paw`.

---

## Phase 5: User Story 3 - Add or Swap Agent Providers Without Session Rework (Priority: P1)

**Goal**: Reject incomplete providers, expose strict provider definitions, run conformance, and switch providers without leaking or reusing another provider's continuation.

**Independent Test**: Configure Claude and deterministic providers for the same standard session test. Confirm both pass the shared contract or report a typed skip/failure, and confirm provider switching creates a fresh provider continuation with visible diagnostics.

### Tests for User Story 3

- [ ] T046 [P] [US3] Add provider registry, manifest rejection, and conformance-status tests in `backend-ts/packages/harness/test/ProviderRegistry.test.ts`
- [ ] T047 [P] [US3] Add provider switch and continuation ownership tests in `backend-ts/apps/api/test/unit/Modules/AgentProviders/ProviderSwitch.test.ts`

### Implementation for User Story 3

- [ ] T048 [US3] Implement the shared provider conformance runner in `backend-ts/packages/harness/src/Provider/Conformance.ts`
- [ ] T049 [US3] Enforce provider definition validation and contract rejection in `backend-ts/packages/harness/src/Provider/Registry.ts`
- [ ] T050 [US3] Implement provider diagnostic redaction rules in `backend-ts/packages/harness/src/Provider/Diagnostics.ts`
- [ ] T051 [US3] Implement provider selection, override, and provider-session ownership rules in `backend-ts/apps/api/src/Modules/AgentProviders/Service.ts`
- [ ] T052 [US3] Expose provider conformance summaries through HTTP handlers in `backend-ts/packages/api-core/src/Modules/AgentProviders/Api.ts` and `backend-ts/apps/api/src/Modules/AgentProviders/Http.ts`
- [ ] T053 [US3] Implement `paw providers doctor [provider]` using public diagnostics in `packages/paw-cli/src/Modules/Agent/ProvidersCommand.ts`

**Checkpoint**: US3 proves the abstraction is not Claude-only and provider-native details stay behind the provider boundary.

---

## Phase 6: User Story 4 - Capabilities Are Explicit and Safe (Priority: P2)

**Goal**: Make allowed, denied, and unsupported capabilities explicit per Workspace/session and prevent unsupported provider affordances from hanging turns.

**Independent Test**: Run one deterministic session with a reduced capability set and one with a broader set. Ask for an allowed action, a denied action, and an unsupported interactive action. Confirm each reaches a visible normalized outcome.

### Tests for User Story 4

- [ ] T054 [P] [US4] Add capability policy tests for allowed, denied, unsupported, and provider-native capability attempts in `backend-ts/packages/harness/test/CapabilityPolicy.test.ts`
- [ ] T055 [P] [US4] Add API-level capability denial and normalized event tests in `backend-ts/apps/api/test/unit/Modules/AgentTurns/CapabilityPolicy.test.ts`

### Implementation for User Story 4

- [ ] T056 [US4] Implement host-owned capability decision evaluation in `backend-ts/packages/harness/src/Provider/CapabilityPolicy.ts`
- [ ] T057 [US4] Enforce capability boundary decisions before and during turns in `backend-ts/apps/api/src/Modules/AgentTurns/Service.ts`
- [ ] T058 [US4] Add deterministic provider scripts for capability denial and unsupported behavior in `backend-ts/packages/harness/src/Providers/Deterministic.ts`

**Checkpoint**: US4 proves capability gaps are visible outcomes, not stalled provider work.

---

## Phase 7: User Story 5 - Long-Lived Session History Stays Useful (Priority: P2)

**Goal**: Preserve useful history through summaries, archives, or rotation without storing Workspace snapshots or retrying stale continuation forever.

**Independent Test**: Drive a deterministic long-session scenario past the configured maintenance threshold. Confirm readable history is preserved, a stale provider continuation rotates with an explanation, and no full Workspace snapshot is stored.

### Tests for User Story 5

- [ ] T059 [P] [US5] Add history maintenance threshold and no-Workspace-snapshot tests in `backend-ts/apps/api/test/unit/Modules/AgentTurns/HistoryMaintenance.test.ts`
- [ ] T060 [P] [US5] Add stale continuation rotation tests in `backend-ts/packages/harness/test/ContinuationRotation.test.ts`

### Implementation for User Story 5

- [ ] T061 [US5] Implement session history summary/archive maintenance in `backend-ts/apps/api/src/Modules/AgentTurns/HistoryMaintenance.ts`
- [ ] T062 [US5] Implement provider-scoped continuation rotation decisions in `backend-ts/packages/harness/src/Provider/ContinuationRotation.ts`
- [ ] T063 [US5] Surface reset, rotation, and stale-session diagnostics through turn state reads in `backend-ts/apps/api/src/Modules/AgentTurns/Service.ts`

**Checkpoint**: US5 keeps long-lived session history usable while preserving the no Workspace snapshot rule.

---

## Phase 8: User Story 6 - Agent Instructions and Memory Are Per Workspace (Priority: P3)

**Goal**: Resolve the selected Workspace at turn start and prove two Workspaces do not leak instructions, memory, skills, files, plugin state, environment policy, capabilities, or provider continuation into each other.

**Independent Test**: Run the same provider and same prompt against two distinct Workspaces and confirm each answer, event stream, capability behavior, and provider continuation reflects only that Workspace. Diagnostics may identify Workspace identity and materialization status only.

### Tests for User Story 6

- [ ] T064 [P] [US6] Add two-Workspace provider isolation tests in `backend-ts/packages/harness/test/WorkspaceIsolation.test.ts`
- [ ] T065 [P] [US6] Add session workspace binding and diagnostics tests in `backend-ts/apps/api/test/unit/Modules/Sessions/WorkspaceBinding.test.ts`

### Implementation for User Story 6

- [ ] T066 [US6] Implement the Workspace materializer port for decoded turn-time context in `backend-ts/packages/harness/src/Workspace/Materializer.ts`
- [ ] T067 [US6] Implement app-side Workspace materialization summaries in `backend-ts/apps/api/src/Modules/Workspaces/Materialization.ts`
- [ ] T068 [US6] Wire selected Workspace identity and materialization-status diagnostics into turn reads in `backend-ts/apps/api/src/Modules/AgentTurns/Service.ts`

**Checkpoint**: US6 proves Workspace isolation without adding Workspace preview, Workspace diff, or full effective-context inspection.

---

## Phase 9: Polish and Cross-Cutting Concerns

**Purpose**: Update project guidance and run the agreed gates.

- [ ] T069 [P] Document the `domain-core`, `api-core`, `rpc-core`, `harness`, `apps/api`, and `apps/rpc` boundaries in `backend-ts/CONVENTIONS.md`
- [ ] T070 [P] Update Effect/backend session guidance for future agents in `.agent/skills/domain-effect/SKILL.md`
- [ ] T071 [P] Update CLI skill fragments for the new provider/session operator commands in `packages/paw-cli/src/Skills/Fragments.ts`
- [ ] T072 Run backend-ts typecheck, Biome, and provider tests and record any gate notes in `specs/006-claude-agent-session-engine/quickstart.md`
- [ ] T073 Run `paw` provider/session smoke commands and record any gate notes in `specs/006-claude-agent-session-engine/quickstart.md`
- [ ] T074 Run the repo-level `just check` integration gate and record any known unrelated failures in `specs/006-claude-agent-session-engine/quickstart.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks every user story.
- **US1**: Depends on Phase 2. This is the MVP implementation slice.
- **US2**: Depends on Phase 2 and can use the deterministic provider from US1 for end-to-end validation.
- **US3**: Depends on Phase 2 and should be run after US1 when validating the full provider abstraction.
- **US4**: Depends on Phase 2 and benefits from the deterministic provider scripts from US1.
- **US5**: Depends on Phase 2 and benefits from US2 recovery semantics.
- **US6**: Depends on Phase 2 and benefits from US1 session invocation target wiring.
- **Phase 9 Polish**: Depends on the story slices being implemented for the scope being delivered.

### User Story Dependencies

- **US1 (P1)**: Required MVP. Provides the core provider-backed session path.
- **US2 (P1)**: Required for trustworthy long-running turns; can be implemented after or alongside US1 once the foundational contracts exist.
- **US3 (P1)**: Required to prove the provider-neutral abstraction; should be completed before calling the feature done.
- **US4 (P2)**: Adds the full capability safety boundary.
- **US5 (P2)**: Adds long-session maintenance and rotation behavior.
- **US6 (P3)**: Adds cross-Workspace isolation proof without adding Workspace preview.

### Within Each User Story

- Write tests first and confirm they fail for the missing behavior.
- Define or extend schemas before handlers and CLI consumers.
- Implement harness behavior before app services that call it.
- Implement services before HTTP/RPC handlers.
- Implement public HTTP/RPC behavior before `paw` operator commands that consume it.
- Validate each story through its independent test before moving to lower-priority stories.

---

## Parallel Opportunities

- T003, T004, T005, and T006 can run in parallel after T001.
- T009, T010, T011, T012, T013, and T014 can run in parallel once package skeletons exist.
- T016 through T020 can run in parallel because they target separate test files.
- T038, T039, and T040 can run in parallel.
- T046 and T047 can run in parallel.
- T054 and T055 can run in parallel.
- T059 and T060 can run in parallel.
- T064 and T065 can run in parallel.
- T069, T070, and T071 can run in parallel after the implementation surfaces settle.

## Parallel Example: User Story 1

```bash
# Provider/harness tests
Task: "T016 Add base provider conformance tests in backend-ts/packages/harness/test/ProviderConformance.test.ts"
Task: "T017 Add normalized event mapping tests in backend-ts/packages/harness/test/EventNormalization.test.ts"

# Public surface tests
Task: "T018 Add provider HTTP contract tests in backend-ts/apps/api/test/unit/Modules/AgentProviders/Http.test.ts"
Task: "T019 Add session and turn HTTP contract tests in backend-ts/apps/api/test/unit/Modules/AgentTurns/Http.test.ts"
Task: "T020 Add paw integration tests in packages/paw-cli/test/integration/agent-session-engine.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T038 Add active-query tests in backend-ts/packages/harness/test/SessionRunner.test.ts"
Task: "T039 Add restart recovery tests in backend-ts/apps/api/test/unit/Modules/AgentTurns/Recovery.test.ts"
Task: "T040 Add paw follow/cancel tests in packages/paw-cli/test/integration/agent-turn-controls.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 with the deterministic provider, HTTP/RPC contracts, and `paw` smoke.
3. Validate US1 independently using `cd backend-ts && bun run test -- agent-provider` and the deterministic `paw sessions send/events` smoke.
4. Add Claude smoke only when credentials/runtime are available.

### Complete P1 Slice

1. Complete US1.
2. Complete US2 for follow-ups, cancellation, and restart recovery.
3. Complete US3 for provider definition validation, conformance, diagnostics, and provider switching.
4. Re-run backend-ts typecheck, Biome, provider tests, API tests, RPC tests, and `paw` smoke.

### Incremental Delivery

1. Add US4 to make capability decisions explicit and safe.
2. Add US5 to make long-lived history and continuation rotation reliable.
3. Add US6 to prove Workspace isolation without adding preview or effective-context inspection.
4. Finish Phase 9 and run the repo gate.

## Notes

- Do not add frontend, chat rendering, Workspace preview, Workspace diff, container runtime, OneCLI, agent-vault, Infisical, or repo-token tasks to this feature.
- Do not use current Python session/provider code as the architecture model; it is legacy context only.
- `api-core` means HTTP/OpenAPI only. RPC protocols live in `rpc-core`.
- `harness` is a reusable provider harness library, not a public API surface.
- Public HTTP/RPC/`paw` outputs expose normalized Pawrrtal events only.
