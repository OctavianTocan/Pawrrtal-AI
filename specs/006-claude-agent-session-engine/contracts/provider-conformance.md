# Contract: Provider Conformance

Every selectable provider must pass the base conformance pack or declare unsupported capabilities that are handled visibly.

## Required Scenarios

### 1. Manifest Decodes

The provider definition decodes through Schema and includes identity, kind, readiness, capabilities, continuation behavior, setup requirements, and redacted diagnostics.

Pass criteria:

- no unchecked manifest object;
- no secret in diagnostics;
- unsupported capabilities are explicit.

### 2. Simple Turn

Given one user prompt, the provider emits:

1. `turn.started`
2. one or more `activity` or `progress` events
3. `answer.completed`
4. `turn.completed`

Pass criteria:

- turn reaches `complete`;
- final response is represented as normalized output;
- no provider-native event is required by the surface.

### 3. Follow-Up Behavior

When a follow-up arrives during an active turn:

- providers with `activeTurn` support accept it through `push`;
- providers without it queue or deny visibly.

Pass criteria:

- no duplicate competing turn is created;
- the observed behavior matches the manifest.

### 4. Cancellation

When cancellation is requested:

- native providers abort;
- best-effort providers stop future visible output or emit a clear best-effort result;
- unsupported providers deny cancellation visibly.

Pass criteria:

- turn reaches `cancelled`, `failed`, or declared unsupported state;
- no final answer appears after terminal cancellation except an explicit cancellation notice.

### 5. Stale Continuation Recovery

Given an invalid or stale continuation:

- provider reports stale/invalid session;
- engine clears or rotates the provider session;
- next turn can start fresh.

Pass criteria:

- recovery emits `continuation.rotated` or typed stale-session diagnostic;
- stale continuation is not retried indefinitely.

### 6. Capability Denial

Given a disabled or unsupported capability:

- provider blocks or adapts through Pawrrtal host policy;
- the user/operator sees `capability.denied` or equivalent typed failure.

Pass criteria:

- no unsupported interactive path hangs;
- denial includes provider id, capability id, and safe next action.

### 7. Provider Switch Isolation

Given a session with provider A continuation, switching to provider B:

- does not reuse A's continuation;
- starts B with a fresh session unless an explicit migration exists.

Pass criteria:

- provider session records are provider-scoped;
- diagnostics explain any continuity loss.

### 8. Deterministic Provider Proof

The deterministic provider runs the same scenarios without external credentials or native SDKs.

Pass criteria:

- CI can prove the contract without Claude credentials;
- deterministic provider and Claude share the same public event/state categories.

## Claude-Specific Smoke

Claude Agent SDK smoke is required when credentials/runtime are available:

- readiness detects SDK package and executable availability;
- one simple turn streams normalized events;
- resume works when SDK returns a continuation;
- stale session and rate-limit failures map to typed errors.

When Claude credentials are unavailable in CI, the deterministic provider remains the required gate and Claude smoke is reported as skipped with a clear reason.

## Failure Reporting

Each failed conformance scenario records:

- provider id;
- scenario id;
- declared capability involved;
- observed normalized events;
- typed failure;
- redacted provider diagnostic;
- safe next action.
