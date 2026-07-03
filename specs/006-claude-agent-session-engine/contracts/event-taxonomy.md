# Contract: Normalized Event Taxonomy

This contract defines the public event names for 006. It is inspired by NanoClaw's compact provider events (`init`, `activity`, `progress`, `result`, `error`) but uses Pawrrtal's normalized names before events reach storage, HTTP responses, RPC streams, `paw`, or conformance reports.

## Event Names

| Event | Meaning |
|---|---|
| `turn.started` | The provider accepted a turn and created or resumed provider continuation. |
| `progress` | User/operator-visible progress text. |
| `activity` | Liveness signal used to detect stuck turns; may be hidden from ordinary output. |
| `tool.started` | A tool or host-controlled action started. |
| `tool.completed` | A tool or host-controlled action completed successfully. |
| `tool.failed` | A tool or host-controlled action failed. |
| `capability.denied` | Pawrrtal or the provider denied a requested capability. |
| `diagnostic` | Redacted operator-only diagnostic summary. |
| `continuation.rotated` | Provider continuation rotated or reset. |
| `error` | Recoverable or terminal typed failure. |
| `answer.delta` | Incremental assistant answer text. |
| `answer.completed` | Final assistant answer text or explicit no-response result. |
| `turn.cancelled` | The turn reached a cancellation terminal state. |
| `turn.completed` | The turn reached normal terminal completion. |

## Rules

- Provider-native payloads must be decoded and normalized before public storage or output.
- Public HTTP/RPC/`paw` clients must not receive provider-native event names.
- Event ordering is monotonic per turn.
- `turn.completed`, `turn.cancelled`, and terminal `error` end a turn.
- Long-running provider work must emit `activity` while progress is still happening.
- Redacted diagnostics may explain provider behavior, but must not expose secrets, raw credentials, unrestricted filesystem authority, provider continuation values, or native request/response bodies.
