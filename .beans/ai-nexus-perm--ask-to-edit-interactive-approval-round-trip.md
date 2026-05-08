# ai-nexus-perm
title: 'Implement Ask-to-Edit: interactive approval round-trip for write/exec tools'
status: todo
type: feature
priority: medium
created_at: 2026-05-08T08:25:00Z
updated_at: 2026-05-08T08:25:00Z
---

## Context

The default permission mode for new users is **Ask to Edit**.  Today
the implementation is "deny write/exec tools with a hint" — the agent
gets back a tool-result string explaining it should ask the user to
switch to Full Access.  That's a v0; the *intent* of Ask-to-Edit is
that the agent can attempt a write, the UI surfaces an inline approval
card ("Allow `write_file: notes.md`?  [Approve] [Deny]"), the user
clicks one, and the tool either runs or returns a deny tool-result
with the user's reasoning.

This is the same UX pattern as Cursor's "Accept/Reject" gating, Claude
Agent SDK's `ask` permission result, and Craft Agents' middle mode.

## What to build

### 1. Decision shape — backend

Extend `app/core/permissions/gate.py`'s `PermissionDecision` to carry
a third state:

```python
class Decision(StrEnum):
    ALLOW = "allow"
    DENY = "deny"
    ASK = "ask"
```

In Ask-to-Edit mode, write/exec tools resolve to `ASK` instead of `DENY`.
Plan mode and Default-Permissions semantics for non-write tools stay
`ALLOW`.

### 2. Streaming protocol — backend

The chat stream gains two new SSE event types:

- `approval_request`: `{ id, tool_name, tool_input, category, summary }`
  — emitted when the agent loop hits an `ASK` decision.  The agent
  loop **suspends** for that tool call, marking the conversation
  state as awaiting approval.
- `approval_response`: client → server (sent as a normal chat message
  with a structured envelope, or a dedicated POST endpoint
  `/chat/{conversation_id}/approvals/{request_id}` — pick whichever
  is cheaper to wire through the existing streaming session).
  Body: `{ approved: bool, reason?: string }`.

When approval lands, the agent loop resumes:
- approved → execute the tool, feed the real result back to the model
- denied → feed a synthesised tool-result (`Tool execution denied by
  user: <reason>`) back to the model

Suspended approvals must survive a brief client disconnect — store the
pending request in the conversation row so a reconnect can re-emit
the `approval_request` event.

### 3. Frontend — inline approval card

Render an inline `ApprovalRequestCard` in the message stream when an
`approval_request` event arrives.  Card UI:

- Tool name + a one-line summary of the input (truncate JSON; show
  full payload in a "Show details" disclosure).
- Two buttons: **Approve** (primary) / **Deny** (secondary, opens a
  small textarea for an optional reason).
- "Always allow `write_file` for this conversation" checkbox — sets
  a per-conversation grant cached client-side (and sent as a flag so
  subsequent ASKs for the same tool short-circuit to ALLOW).
- Disabled state once the user clicks one option, with a final
  "Approved" / "Denied — <reason>" status line so the user can scroll
  back and audit.

### 4. Tests

- Unit: gate returns `ASK` for WRITE in Ask-to-Edit, `ALLOW` for READ.
- E2E: chat stream emits `approval_request`, agent loop pauses,
  POST'ing the response resumes execution with the right tool result.
- Frontend component test for the approval card (approve, deny with
  reason, always-allow toggle, disconnected state).

## Out of scope

- Persistent per-workspace allowlists ("always allow `read_file` on
  `~/projects/x`") — that's the Custom-mode feature, separate bean.
- The Auto-Review LLM judge — see
  `ai-nexus-perm--implement-auto-review-llm-judged-tool-permission.md`.

## Why deferred

The streaming protocol change (suspend/resume of the agent loop on
external input) is the single biggest piece of design work in the
permissions stack.  Punted from PR #120 to keep that PR's diff
reviewable.  Owner: Tavi to schedule once #120 + the workspace tools
stack are merged into `development`.
