---
# ai-nexus-perm
title: 'Implement Auto-review: LLM-judged tool permission gate'
status: todo
type: feature
priority: medium
created_at: 2026-05-08T07:55:00Z
updated_at: 2026-05-08T07:55:00Z
---

## Context

The chat composer's permission selector currently exposes five modes:
`Plan`, `Ask to Edit`, `Auto-review`, `Full access`, `Custom`.  Of these,
**Auto-review** is rendered greyed-out with a "coming soon" hint — its
backend behaviour today falls through to Full Access (i.e. allows
everything) so a user who somehow selects it doesn't see denials they
didn't ask for.

Auto-review is the conceptually richest mode: instead of a static
allow/deny per category, a *second* LLM judges each tool call's
safety in light of the conversation so far and either approves it,
denies it, or asks the main agent to clarify.  The judge sees:

  - The tool name + arguments the main agent wants to call.
  - The conversation history, so it can pick up implicit consent
    ("yeah go ahead and clean up the artifacts directory" → write_file
    on artifacts/* may be auto-approved later).
  - The tool category (read/write/exec) and per-mode default policy.

The judge's reply lands in the main agent's tool-result stream so the
main model sees the reasoning ("denied: this would clobber a file
the user asked you to preserve in turn 3").

## What to build

1. **Backend** — `app/core/permissions/auto_review.py`:
   - A `judge(tool_call, conversation_history, mode_context) -> Decision`
     function that calls a small LLM (Sonnet/Haiku/Flash; configurable).
   - Decision schema mirrors `gate.PermissionDecision` (Allow / Deny +
     a `reason` the main model surfaces verbatim).
   - The judge runs only when `permission_mode == AUTO_REVIEW`; gate
     stays as the cheap default for the other modes.

2. **Backend** — wire into `chat.py` and the agent loop:
   - When mode is auto-review, every tool call goes through the judge
     before execution.  Read tools auto-approve without LLM call (keep
     latency reasonable).  Write/exec are judged.

3. **Frontend** — un-disable in the permission selector:
   - Remove `'auto-review'` from `PERMISSION_MODE_DISABLED` in
     `frontend/features/chat/constants.ts`.
   - Drop the "Coming soon — disabled for now." hint and the warning
     glyph; Auto-review becomes a real selectable mode.

## Non-goals

- Per-source / per-tool fine-grained policy (that's `Custom` mode).
- Surfacing the judge's reasoning in dedicated UI — for now the main
  agent quotes the decision back to the user in chat.

## Open design questions

- Latency: a write-heavy turn could trigger a judge call on every
  tool.  Cache by `(tool_name, hash(args))` per-conversation?
- Model choice: sonnet vs haiku.  Latency-sensitive, so haiku probably.
  Make it config-driven so we can A/B.
- Failure mode: what if the judge call itself fails?  Fail closed
  (deny the underlying tool) is the safe default; surface the failure
  to the user so they can switch to Full Access if they really need
  the action.

## References

- `backend/app/core/permissions/` — current static-table gate.
- `backend/app/core/permissions/modes.py` — `AUTO_REVIEW` enum entry
  with the design intent in its docstring.
- Claude Agent SDK's `can_use_tool` callback pattern + Craft Agents
  permission cascade — both are in the design doc that led to this
  permission system.
