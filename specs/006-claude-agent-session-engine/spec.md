# Feature Specification: Agent Provider Session Engine

**Feature Branch**: `006-claude-agent-session-engine`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Make a spec for using the Claude Agent SDK to drive the whole sessions stuff for Pawrrtal, inspired by Nanoclaw's use of the Claude Agent SDK to drive the agent. Update the Claude session spec so it actually builds the abstraction that allows any other agent runtime too. Claude is the first proving provider, but the main deliverable is a provider-neutral agent session contract that can support future SDKs, CLIs, hosted agents, local agents, and deterministic test providers without redefining Pawrrtal sessions. Containerization and related Nanoclaw infrastructure are out of scope for this spec and move to a separate Workspace/sandbox-runtime spec. Repo tokens are loved but should become their own later spec."

## Clarifications

### Session 2026-07-03

- Q: How should `006-claude-agent-session-engine` relate to the older `001-claude-agent-sdk-streaming` spec? → A: 006 supersedes 001; 001 becomes historical reference only.
- Q: What execution model should 006 require for provider-backed turns? → A: NanoClaw-style provider harness/session runner; persist Session, Turn, Event, and ProviderSession state for recovery.
- Q: How should concurrent messages behave while a provider turn is already running? → A: Follow NanoClaw: one active provider query per Session runner; ordinary follow-ups are pushed into the active `AgentQuery`, while runner/admin commands that require a fresh query abort the active query and remain pending for the next loop.
- Q: Should 006 require UI/frontend integration? → A: No. Treat UI/frontend as nonexistent for this spec; prove the engine through backend HTTP/RPC contracts and `paw` only.
- Q: What should 006 require for provider-native payloads and diagnostics? → A: Public HTTP/RPC/`paw` outputs expose normalized Pawrrtal events only; provider-native payloads may be retained only as redacted operator diagnostics.
- Q: What should a provider have to declare before Pawrrtal allows it to be selected for a session? → A: Strict provider definition: identity, setup requirements, readiness check, supported inputs, capabilities, event types, continuation mode, cancellation behavior, recovery actions, diagnostic redaction rules, and conformance proof.
- Q: What should count as the second provider proof for proving the abstraction is not Claude-only? → A: A first-class deterministic provider: a real selectable in-repo provider with scripted streaming, continuation, follow-up, cancellation, capability denial, setup failure, and recovery behavior.
- Q: How should provider continuation ownership work across provider switches, stale state, and non-resumable providers? → A: Provider-owned continuation: switches start a new provider continuation unless explicit migration exists; stale or invalid continuation rotates with a visible explanation; non-resumable providers are rotation-only.
- Q: Should the spec define a fixed normalized event taxonomy now, and should it reference NanoClaw? → A: Yes. Define canonical normalized event names now, based on NanoClaw's provider event shape but expanded for Pawrrtal storage, RPC, HTTP, and `paw`.
- Q: How should long-lived session history stay separate from Workspace materialization, and how does that compare to NanoClaw? → A: Separate models: Session history stores events, summaries, and archives; Workspace materialization resolves current instructions, memory, skills, files, plugin state, environment policy, and capabilities at turn start without storing Workspace snapshots, matching NanoClaw's agent-group workspace vs per-session conversation split.
- Q: Should 006 include a Workspace preview surface? → A: No. Workspace preview is out of scope for this spec and may be handled later; 006 only needs selected Workspace identity and materialization status in diagnostics.
- Q: What should the cross-Workspace isolation proof require? → A: A two-Workspace isolation proof using the same provider and same prompt against distinct instructions, memory, skills, files, plugin state, environment policy, capabilities, and provider continuation, proving zero cross-leakage.
- Q: What exact capability boundary should 006 require for provider turns? → A: Full host-owned boundary: tools, file read/write, shell/commands, web access, user-question flows, scheduled work, outbound messaging, network access, secrets access, and provider-native actions are each declared allowed, denied, or unsupported per Workspace/session.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sessions Run Through a Pluggable Agent Provider (Priority: P1)

A person sends a message through a backend contract or `paw` operator command and the session is handled by the selected agent provider through one shared session contract, not a one-shot model call and not a Claude-only path. The provider session keeps the relevant session history and Workspace state, streams progress while work is happening, can use the host-approved tool surface, and returns a coherent final answer to the same session.

**Why this priority**: This is the core shift from "Claude as another model option" to "Pawrrtal sessions are provider-backed agent sessions." Without this abstraction, the feature becomes another hard-coded provider path instead of the session layer Pawrrtal needs.

**Independent Test**: Start a new session through the first Claude provider using the backend contract or `paw`, send a message that requires multi-step agent work, then send a follow-up in the same session. Repeat the same standard session test through the deterministic provider. Confirm both providers produce the same Pawrrtal-visible event, state, capability, and final-answer behavior even when their native internals differ.

**Acceptance Scenarios**:

1. **Given** a supported session, **When** the user sends a message, **Then** Pawrrtal routes the turn through the selected agent provider and shows progress before the final answer completes.
2. **Given** a session with prior turns, **When** the user asks a follow-up, **Then** the agent session preserves relevant history and answers as part of the same session.
3. **Given** the agent uses a host-approved tool during the turn, **When** the tool starts, completes, or fails, **Then** the session receives a clear event for that activity and the final answer remains coherent.
4. **Given** multiple backend/RPC/CLI clients observe the same session, **When** a turn runs, **Then** each client can read the same ordered session outcome through the public contract.
5. **Given** the deterministic provider or a future compatible agent provider is selected, **When** the same session test runs, **Then** backend/RPC/CLI clients do not need provider-specific behavior to inspect progress, tool activity, errors, cancellation, and final output.

---

### User Story 2 - Follow-Ups, Interruptions, and Recovery Are First-Class (Priority: P1)

A user can keep talking while an agent is working, cancel or reset a stuck session, and recover after a runtime restart without losing pending work. Operators can inspect the current state of a session turn and understand whether it is pending, running, waiting, failed, cancelled, or complete.

**Why this priority**: Long-running agent sessions are only usable if they do not become black boxes. Recovery is the difference between a neat demo and a session system a maintainer can trust.

**Independent Test**: Start a long-running turn, send a follow-up before completion, cancel another turn, and restart the runtime while a message is pending. Confirm follow-ups are delivered to the active session in order, cancellation produces a clear terminal state, and pending work resumes or fails visibly after restart.

**Acceptance Scenarios**:

1. **Given** an agent turn is running, **When** the user sends another ordinary message in the same session, **Then** the follow-up is pushed into the active provider query without creating a competing duplicate turn.
2. **Given** a runner or admin command requires a fresh provider query, **When** it arrives during an active turn, **Then** the active query is aborted and the command remains pending for the next runner loop.
3. **Given** an agent turn is cancelled, **When** the cancellation completes, **Then** no further output from that turn is delivered except a clear cancellation notice.
4. **Given** a message is pending or running when the runtime restarts, **When** the system comes back, **Then** the message is either resumed or marked failed with a recoverable reason.
5. **Given** an operator inspects a session, **When** a turn is unhealthy, **Then** the state explains what is waiting, what last made progress, and what action is safe to take.

---

### User Story 3 - Add or Swap Agent Providers Without Session Rework (Priority: P1)

A maintainer can start with Claude as the first agent runtime while proving the provider contract any future runtime must satisfy: provider identity, readiness, session continuity, input acceptance, event emission, capability reporting, cancellation, recovery, setup diagnostics, and safe failure behavior. The Claude path validates the boundary instead of becoming a one-off session implementation that future providers must work around.

**Why this priority**: This is the actual abstraction the feature must deliver. Starting with Claude is useful only if a second provider can fit the same shape without changing sessions, backend contracts, diagnostics, or operator recovery.

**Independent Test**: Configure Claude and the deterministic provider for the same standard session test. Confirm both satisfy the provider contract, and confirm adding or switching that provider does not require changing backend/RPC/CLI client behavior, session state names, or operator diagnostics.

**Acceptance Scenarios**:

1. **Given** a provider is available, **When** Pawrrtal evaluates it, **Then** the provider exposes a strict provider definition covering identity, setup requirements, readiness check, supported inputs, capabilities, event types, continuation mode, cancellation behavior, recovery actions, diagnostic redaction rules, and conformance proof before it is selected for a user session.
2. **Given** Claude is selected for a session, **When** the session starts, **Then** Pawrrtal records the selected provider, provider capabilities, and continuation state without exposing provider internals to ordinary backend/RPC/CLI clients.
3. **Given** the deterministic provider is selected for the same standard session test, **When** the turn runs, **Then** Pawrrtal uses the same visible turn states, session events, capability decisions, and diagnostics as it uses for Claude.
4. **Given** a provider lacks a capability Pawrrtal can represent, **When** the user asks for that capability, **Then** the turn fails or adapts through the same capability-denial flow used by other providers.
5. **Given** a provider runtime cannot authenticate, start, resume, stream, cancel, or recover, **When** the turn is attempted, **Then** diagnostics name the provider-level failure and the safe next action.
6. **Given** a provider does not satisfy the required contract, **When** it is configured, **Then** Pawrrtal rejects it before ordinary users can select it for a session.

---

### User Story 4 - Capabilities Are Explicit and Safe (Priority: P2)

A maintainer can decide which agent capabilities are available to a session, and the agent never hangs because it tried to use an unsupported interactive affordance. Tools, file read/write, shell/commands, web access, user-question flows, scheduled work, outbound messaging, network access, secrets access, and provider-native actions are each declared as allowed, denied, or unsupported through Pawrrtal's host policy.

**Why this priority**: Nanoclaw's useful lesson is not "allow everything"; it is that the agent runtime should be the primary harness while the host remains honest about what the environment can support.

**Independent Test**: Configure one session with a reduced capability set and another with a broader set. Ask both to perform an allowed action, a denied action, and an unsupported interactive action. Confirm allowed actions work, denied actions do not execute, and unsupported actions fail clearly rather than stalling the turn.

**Acceptance Scenarios**:

1. **Given** a capability is enabled for a session, **When** the agent uses it, **Then** the action is executed through Pawrrtal's host-controlled policy and recorded in the session.
2. **Given** a capability is disabled for a session, **When** the agent attempts it, **Then** the action is denied and the denial is visible to the user or operator.
3. **Given** the agent attempts an interactive behavior that Pawrrtal does not support directly, **When** the turn reaches that behavior, **Then** the system adapts it to a supported Pawrrtal flow or blocks it with a clear reason.
4. **Given** a capability set changes, **When** the next turn starts, **Then** the agent sees the updated capability boundaries without requiring a global restart.

---

### User Story 5 - Long-Lived Session History Stays Useful (Priority: P2)

A session can last for days or weeks without becoming impossible to resume. The system preserves useful transcript history, summarizes or archives older material when needed, and starts fresh only when that is safer than repeatedly failing to reload stale state.

**Why this priority**: Agent SDK sessions are powerful because they preserve history, but unmanaged transcript growth becomes a reliability problem. The user should get continuity without invisible bloat.

**Independent Test**: Exercise a long session until it crosses the configured history-maintenance threshold. Confirm older session material is preserved in a readable form, the active session remains usable, and no Workspace snapshot is stored as part of the history-maintenance path.

**Acceptance Scenarios**:

1. **Given** a session grows large, **When** the system maintains history, **Then** older information is summarized or archived before it is removed from the active session.
2. **Given** a stored session can no longer be resumed, **When** the next turn runs, **Then** the system starts a fresh session and explains the reset instead of repeatedly failing.
3. **Given** archived session material exists, **When** the agent needs prior history, **Then** the useful summary is available without reloading every raw event or freezing a copy of the Workspace.
4. **Given** a user requests a manual reset, **When** the reset completes, **Then** future turns start from a clean session while prior history remains available for review according to retention policy.

---

### User Story 6 - Agent Instructions and Memory Are Per Workspace (Priority: P3)

Each Workspace can have its own instructions, memory, enabled skills, mounted knowledge, files, plugin state, and environment policy without leaking into unrelated sessions. The session engine resolves the selected Workspace at turn start without adding a separate Workspace preview surface.

**Why this priority**: Pawrrtal needs Nanoclaw's agent-operable posture, but with Pawrrtal's existing workspace structure and preference for explicit, validated configuration.

**Independent Test**: Create two Workspaces with distinct instructions, memory, skills, files, plugin state, environment policy, capabilities, and provider continuation. Run the same provider and same prompt in both Workspaces. Confirm each answer, event stream, capability behavior, and provider continuation reflects only its own Workspace, then confirm diagnostics identify the selected Workspace and materialization status without exposing raw Workspace contents.

**Acceptance Scenarios**:

1. **Given** two sessions use different Workspaces, **When** each runs a turn, **Then** each agent sees only the instructions, memory, skills, files, plugin state, environment policy, and capabilities assigned to that Workspace.
2. **Given** a maintainer changes a Workspace's instructions or memory, **When** the next turn runs, **Then** Workspace materialization resolves the current state and no unrelated Workspace is affected.
3. **Given** a client inspects session diagnostics, **When** Workspace information is included, **Then** diagnostics name only the selected Workspace identity and materialization status, not raw Workspace contents.

### Edge Cases

- **Agent runtime unavailable**: affected turns fail gracefully with a clear status; other providers and existing sessions keep working.
- **Continuation or session state missing**: the stale state is cleared, the user is told the session restarted, and the next turn can proceed.
- **Duplicate delivery from an API/RPC/CLI client**: duplicate inbound messages do not create duplicate agent turns or duplicate final replies.
- **Concurrent ordinary messages in the same session**: messages are ordered and pushed into the active provider query, never run as competing provider turns.
- **Runner/admin commands during an active query**: commands that require a fresh provider query abort the active query and remain pending for the next runner loop.
- **Client disconnects mid-turn**: the turn can continue, and the client can read the latest state when it reconnects.
- **Capability attempted without host support**: the action is blocked or adapted; the agent does not wait forever for an unavailable host path.
- **Provider capability mismatch**: provider-specific gaps are surfaced as provider diagnostics and capability denials, not as generic session failures.
- **Provider switch requested later**: the existing session state explains which provider owns the current continuation; the target provider starts a new continuation unless an explicit migration path exists.
- **Provider contract incomplete**: the provider cannot be selected for user sessions until missing identity, setup, readiness, input, capability, event, continuation, cancellation, recovery, redaction, or conformance behavior is declared and handled.
- **Provider emits unfamiliar native events**: Pawrrtal exposes only normalized session events to HTTP/RPC/`paw` clients and may retain provider-native detail only as redacted operator diagnostics.
- **Provider-native payload contains sensitive detail**: secrets, raw credentials, raw filesystem authority, provider continuation values, and native request or response bodies are removed before any diagnostic is stored or displayed.
- **Provider has no resumable continuation**: Pawrrtal marks the provider as non-resumable or rotation-only, preserves normalized session history, and starts fresh provider continuation when needed instead of pretending native continuity exists.
- **Long-running tool work**: progress remains visible and the system can distinguish legitimate long work from a stuck turn.
- **Very large transcripts or attachments**: history maintenance prevents repeated resume failures and keeps archived history readable.
- **Workspace changes during a long session**: the next turn resolves the current Workspace state; past session history remains a transcript/archive, not a snapshot of the old Workspace.
- **Credential, quota, or rate-limit failure**: the user receives a recoverable explanation and the turn reaches a terminal state.
- **Cross-workspace leakage risk**: tests must demonstrate that instructions, memory, files, skills, environment policy, plugin state, capabilities, and provider continuation stay inside the selected Workspace.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pawrrtal MUST support a provider-backed agent session engine as the primary executor for selected agent sessions, with Claude as the first proving provider rather than the only provider shape.
- **FR-002**: The session engine MUST expose one provider-neutral contract for provider identity, readiness, input acceptance, capabilities, streamed events, cancellation, interruption, continuation state, setup diagnostics, failure diagnostics, and safe recovery actions.
- **FR-003**: A provider MUST declare a strict provider definition before it can be selected for a session, including identity, setup requirements, readiness check, supported inputs, supported and unsupported capabilities, event types, continuation mode, cancellation behavior, recovery actions, diagnostic redaction rules, and conformance proof.
- **FR-004**: The feature MUST prove the abstraction with Claude plus a first-class deterministic provider that is selectable through the same provider contract and supports scripted streaming, continuation, follow-up, cancellation, capability denial, setup failure, and recovery behavior.
- **FR-005**: The session engine MUST preserve durable provider-scoped session identity for each active session and use it to maintain multi-turn continuity when the selected provider supports continuity.
- **FR-006**: Provider-scoped continuation data MUST be owned by the provider that created it and MUST NOT be mixed across providers; provider switches MUST start a new provider continuation unless an explicit migration path exists, stale or invalid continuation MUST rotate with a visible explanation, and non-resumable providers MUST be marked rotation-only.
- **FR-007**: The session engine MUST accept inbound messages from supported backend HTTP, RPC, and `paw` clients through one ordered session pipeline.
- **FR-008**: The session engine MUST stream only canonical normalized events back to clients, using the event taxonomy defined by this spec.
- **FR-009**: The session engine MUST follow NanoClaw's active-query model for concurrent session input: one active provider query per Session runner, ordinary follow-ups pushed into that active `AgentQuery`, and no competing provider turns for the same Session.
- **FR-010**: Users or operators MUST be able to cancel, reset, and retry session turns with clear resulting states.
- **FR-011**: The system MUST persist enough turn state that pending work can be resumed or marked recoverably failed after restart.
- **FR-012**: The system MUST expose the current state of each agent turn as one of: pending, running, waiting, complete, failed, cancelled, or stale.
- **FR-013**: Backend HTTP, RPC, and `paw` clients MUST depend on normalized Pawrrtal session events and turn states, not provider-native payloads; default public outputs and stored session events MUST NOT include raw provider-native payload fields.
- **FR-014**: The session engine MUST respect the host-defined capability boundary for each session, including tools, file read/write, shell/commands, web access, user-question flows, scheduled work, outbound messaging, network access, secrets access, and provider-native actions.
- **FR-015**: Each capability decision MUST be represented as allowed, denied, or unsupported per Workspace/session; the session engine MUST deny or adapt denied and unsupported agent capabilities without leaving the turn stuck.
- **FR-016**: The system MUST record provider selection, provider capability use, capability denial, cancellation, reset, stale-session recovery, provider contract rejection, and terminal turn state in the session history or operator-visible diagnostics.
- **FR-017**: The system MUST maintain long-lived session history through events, summaries, archives, or rotation before growth makes turns unreliable, without storing Workspace snapshots as part of session history.
- **FR-018**: When an active session is stale or cannot be resumed, the system MUST clear or rotate that session and start a recoverable fresh turn with a visible explanation.
- **FR-019**: Each Workspace MUST have isolated instructions, memory, skills, files, plugin state, environment policy, and capability settings.
- **FR-020**: The feature MUST NOT add a Workspace preview surface; diagnostics MAY identify the selected Workspace identity and materialization status but MUST NOT expose raw Workspace contents.
- **FR-021**: Existing non-Agent-SDK providers MUST continue to work unless a later plan explicitly retires them; `001-claude-agent-sdk-streaming` is historical reference only and not a parallel implementation or acceptance path.
- **FR-022**: The feature MUST NOT require adopting Nanoclaw's containerization, credential gateway, or no-config posture as part of this spec.
- **FR-023**: The sandbox-runtime model MUST remain out of scope for this feature except for the minimal Workspace reference needed to run a session.
- **FR-024**: The repo-token footprint badge concept MUST remain out of scope for this feature and be captured in a separate spec.
- **FR-025**: The feature MUST add a minimal `paw` operator surface for listing provider readiness, running deterministic provider turns, reading normalized turn events, and requesting cancellation through the public API.
- **FR-026**: The feature MUST resolve a session invocation target before starting a CLI/API initiated turn: either an existing session with workspace/provider binding, or a new session request with workspace and provider resolved.
- **FR-027**: The feature MUST define separate shared domain, HTTP/OpenAPI, and Effect RPC contract packages so RPC protocols do not live in the HTTP API contract.
- **FR-028**: Provider-backed turns MUST run through a NanoClaw-style provider harness/session runner; durable recovery MUST come from persisted Session, Turn, Event, and ProviderSession records rather than treating the agent loop as a generic workflow job.
- **FR-029**: Runner/admin commands that require a fresh provider query MUST abort the active query and remain pending for the next runner loop rather than being delivered as ordinary follow-up text.
- **FR-030**: The feature MUST NOT require UI/frontend integration, web-chat rendering, or frontend acceptance tests; acceptance MUST be proven through backend HTTP/RPC contracts, provider conformance, and `paw`.
- **FR-031**: Provider-native payloads MAY be retained only as redacted operator diagnostics; diagnostics MUST remove secrets, raw credentials, raw filesystem authority, provider continuation values, and native request or response bodies before storage or output.
- **FR-032**: Workspace materialization MUST resolve the current instructions, memory, skills, files, plugin state, environment policy, and capability settings at turn start; it MUST NOT store a full Workspace snapshot in Session history.
- **FR-033**: Workspace preview, Workspace-diff inspection, and full effective-context inspection are out of scope for this feature and MAY be specified later.

### Normalized Event Taxonomy

The canonical Pawrrtal session event names for this feature are:

- `turn.started`
- `progress`
- `activity`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `capability.denied`
- `diagnostic`
- `continuation.rotated`
- `error`
- `answer.delta`
- `answer.completed`
- `turn.cancelled`
- `turn.completed`

This taxonomy is inspired by NanoClaw's provider event shape: provider-native events such as initialization, activity, progress, result, and error are mapped into Pawrrtal's normalized event names before they reach session storage, HTTP responses, RPC streams, `paw`, or provider conformance reports.

### Session History and Workspace Materialization

This feature follows NanoClaw's useful separation between agent-group workspace and per-session conversation state. A Workspace is the current agent home that materializes instructions, memory, skills, files, plugin state, environment policy, and capability settings at turn start. Session history is the durable record of what happened in a Session: normalized events, turn states, summaries, and archives.

Session history MUST NOT store full Workspace snapshots. If Workspace state changes during a long-lived Session, the next turn uses the newly materialized Workspace state while older session history remains readable as transcript, event, summary, or archive material.

### Key Entities *(include if feature involves data)*

- **Session**: The canonical durable interaction/execution thread in Pawrrtal, carrying user-visible history, routing identity, and lifecycle state.
- **Agent session**: A Session whose turns are executed by the agent session engine.
- **Agent session binding**: The provider, capability boundary, and active provider-session selection attached to a session for agent-executed turns.
- **Agent provider**: A runtime that executes an agent session while satisfying Pawrrtal's provider-neutral expectations for identity, readiness, events, capabilities, continuation, diagnostics, cancellation, and recovery.
- **Agent provider contract**: The shared promise every provider must satisfy before it can be selected for a session.
- **Provider definition**: The strict declaration Pawrrtal validates before a provider can run user sessions, covering identity, setup requirements, readiness check, supported inputs, capabilities, event types, continuation mode, cancellation behavior, recovery actions, diagnostic redaction rules, and conformance proof.
- **Provider session record**: The provider-scoped continuity record for a session, including current status, continuation ownership, resumability, rotation reason when applicable, and the opaque continuation needed to resume.
- **Provider continuation**: The provider-owned value or state reference needed to resume a session, stored and reported without making ordinary backend/RPC/CLI clients provider-specific; it is not portable across providers unless a specific migration path exists.
- **Provider capability summary**: The visible list of what the selected provider can and cannot support for the session.
- **Provider conformance proof**: The standard session test showing that a provider can produce Pawrrtal-visible states, events, diagnostics, and recovery behavior without client contract changes.
- **Deterministic provider**: A first-class in-repo provider used for conformance proof, scripted to exercise streaming, continuation, follow-up, cancellation, capability denial, setup failure, and recovery without external credentials.
- **Provider-scoped state**: Data owned by one provider's runtime, such as native session references, continuation tokens, or recovery markers, which must not be reused as another provider's state.
- **Provider-native diagnostic**: A redacted operator-only diagnostic derived from a provider payload; it may explain provider behavior or failure but is never exposed as a raw HTTP/RPC/`paw` session event.
- **Turn state**: The lifecycle state for one user-triggered unit of work, including timestamps, last progress, terminal status, and recovery reason when applicable.
- **Capability boundary**: The host-owned decision set for a session, declaring tools, file read/write, shell/commands, web access, user-question flows, scheduled work, outbound messaging, network access, secrets access, and provider-native actions as allowed, denied, or unsupported.
- **Workspace**: The long-lived agent home containing instructions, memory, skills, tools, protocols, files, environment policy, plugin state, and capability settings materialized at turn start for sessions created inside it.
- **Workspace materialization**: The current resolved Workspace state visible to a provider turn; it is not copied wholesale into Session history.
- **Session archive**: A preserved summary or transcript artifact that keeps older session history useful without requiring the active session to reload all raw events or a frozen Workspace snapshot.
- **Session event**: A normalized event emitted during a turn. For this feature, the canonical event names are `turn.started`, `progress`, `activity`, `tool.started`, `tool.completed`, `tool.failed`, `capability.denied`, `diagnostic`, `continuation.rotated`, `error`, `answer.delta`, `answer.completed`, `turn.cancelled`, and `turn.completed`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a standard end-to-end demonstration, a user can send a message and see first visible agent progress within 3 seconds under normal local conditions.
- **SC-002**: Claude and the deterministic provider pass the same standard session test with the same Pawrrtal-visible turn states, event categories, diagnostics, and final-answer behavior.
- **SC-003**: A multi-turn test proves that a follow-up question uses prior session history after at least one runtime restart for every tested provider that declares resumable continuity, while a provider switch starts a new provider continuation unless an explicit migration path exists.
- **SC-004**: 100% of tested allowed, denied, and unsupported capability attempts reach a visible outcome without a stuck turn.
- **SC-005**: Cancellation, reset, retry, stale-session recovery, provider contract rejection, and normal completion each produce a distinct terminal or recoverable state in operator-visible diagnostics.
- **SC-006**: A long-session test preserves a readable archive or summary before active provider history/continuation is rotated, stores no full Workspace snapshot, and proves the next turn uses the current materialized Workspace state.
- **SC-007**: A two-Workspace isolation proof uses the same provider and same prompt against distinct instructions, memory, skills, files, plugin state, environment policy, capabilities, and provider continuation, and shows zero leakage between the configured Workspaces.
- **SC-008**: Provider diagnostics let an operator identify selected provider, readiness, capability summary, continuation status, and safe next action for a failed or waiting turn in under 2 minutes.
- **SC-009**: Existing non-Agent-SDK provider checks and the prior Claude streaming behavior either keep passing or are explicitly retired by a later accepted plan.
- **SC-010**: Adding or selecting the deterministic provider requires no changes to backend HTTP, RPC, or `paw` client contracts.
- **SC-011**: A maintainer can use `paw` to list providers, send a deterministic provider message to a new or existing session invocation target, follow normalized events to a terminal state, and request cancellation without any UI/frontend.

## Assumptions

- This broader spec is the active direction for agent-provider session ownership; `specs/001-claude-agent-sdk-streaming/` is historical reference only.
- The first target agent runtime is Claude Code via Anthropic's Claude Agent SDK because that is the Nanoclaw-inspired behavior requested by the user, but acceptance requires proving a provider-neutral shape with a first-class deterministic provider.
- Future providers may be SDK-based, CLI-based, hosted, local, or test-only as long as they satisfy the shared provider contract.
- Provider-backed turn execution follows the provider harness/session runner model: live provider handles own input, cancellation, event streaming, and continuation, while Pawrrtal persists the session, turn, event, and provider-session state needed for recovery.
- Container runtime selection, sandbox substrate changes, credential-vault design, and Nanoclaw's full isolation model are intentionally out of scope for this spec and are captured by the Workspace/sandbox runtime follow-up at `specs/008-agent-context-sandbox-runtime/`.
- Pawrrtal keeps explicit, validated configuration files where they help operators; this feature does not adopt Nanoclaw's no-config philosophy.
- Repo-token footprint reporting is valuable but belongs in a separate follow-up spec.
- UI/frontend integration is out of scope. For this spec, pretend the UI/frontend does not exist; do not add web-chat rendering requirements, frontend acceptance gates, or frontend task dependencies.
- Workspace preview is out of scope for this feature; the session engine only needs selected Workspace identity and materialization status for diagnostics.
- Credential sourcing, profile identity, and provider catalog decisions follow the active Pawrrtal platform specs unless this feature's later plan identifies a direct conflict.

## Dependencies

- Depends on Pawrrtal's existing session, provider selection, backend delivery contracts, diagnostics, Workspace, and memory concepts.
- Depends on the active platform direction for Workspace boundaries and host-defined safety policy.
- Requires planning-phase research into the current Claude Agent SDK behavior, supported hooks/events, continuation model, and unsupported interactive affordances.
- Requires planning-phase definition of the provider comparison contract so Claude can be the first provider without becoming the only provider shape.
- Requires planning-phase definition of a standard provider conformance proof that can be run against Claude and the deterministic provider.
- Requires following the `effect-api-layout` separation while using Pawrrtal's stricter naming: shared schemas/errors in `domain-core`, HTTP/OpenAPI in `api-core`, RPC protocols in `rpc-core`, app-side HTTP in `apps/api`, and app-side RPC in `apps/rpc`.
- May use `specs/001-claude-agent-sdk-streaming/` as historical evidence, but implementation tasks and acceptance gates must come from this 006 spec.
