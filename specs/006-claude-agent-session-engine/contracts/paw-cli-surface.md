# Contract: Paw CLI Surface

006 includes a minimal operator/test surface in `packages/paw-cli` so the provider harness can be exercised without a frontend.

## Command Groups

### `paw providers list`

Lists selectable agent providers.

Required output:

- provider id
- display name
- kind
- readiness
- resume support
- follow-up support
- cancellation support
- short setup status

Required modes:

- human
- `--json`
- `--plain`

### `paw providers doctor [provider]`

Checks readiness for one provider or every provider.

Required checks:

- manifest decodes
- setup requirements are present or clearly missing
- credentials are available or clearly missing
- provider runtime/executable/package is available when applicable
- conformance status is known

Rules:

- Doctor must not start a long-running agent turn.
- Diagnostics are redacted.

### `paw sessions send`

Starts a provider-backed turn for an existing or newly-created session.

Required arguments and flags:

- `--session <id>` optional; continue this session and inherit its workspace/provider binding
- `--provider <id>` optional; provider override when allowed
- `--workspace <workspace-id-or-slug>` required when creating a new session unless a configured default workspace can be resolved
- `--message <text>` or `--message-file <path>` or stdin
- `--json`

Required behavior:

- existing sessions resolve the workspace/provider binding before starting work;
- new sessions require a resolvable workspace and provider before starting work;
- returns session id, turn id, selected provider id, workspace id, state, and first event sequence when available;
- supports deterministic provider in CI;
- does not require frontend state.

### `paw sessions events <session-id>`

Reads normalized events for a session or a specific turn.

Required flags:

- `--turn <turn-id>` optional when the session has one active/recent turn
- `--since <sequence>` optional
- `--follow` optional
- `--json`
- `--plain`

Required behavior:

- prints only normalized event categories;
- never prints raw provider-native payloads by default;
- exits cleanly after terminal event unless `--follow=false`.

### `paw sessions cancel-turn <session-id>`

Requests cancellation for a running turn in a session.

Required flags:

- `--turn <turn-id>` optional when there is exactly one active turn
- `--reason <text>` optional
- `--json`

Required behavior:

- returns resulting turn state or accepted cancellation request;
- surfaces native, best-effort, or unsupported cancellation according to provider manifest.

## API/RPC Boundary

The CLI calls public API endpoints or generated clients. Normal CLI commands must not import provider adapters directly. Test-only helpers may import conformance utilities if they are explicitly marked as test/dev commands.

## Required Tests

- CLI command help includes the new groups.
- `providers list --json` decodes provider definitions.
- `providers doctor deterministic --json` succeeds.
- `sessions send --provider deterministic --workspace <workspace-id-or-slug> --json` starts a new deterministic turn.
- `sessions send --session <session-id> --json` starts a turn from an existing session binding.
- `sessions events <session-id> --follow --json` observes ordered normalized events until terminal state.
- `sessions cancel-turn <session-id>` reaches a visible terminal or declared unsupported state.
