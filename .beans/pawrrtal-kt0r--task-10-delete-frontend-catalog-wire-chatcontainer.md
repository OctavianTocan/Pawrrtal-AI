---
# pawrrtal-kt0r
title: 'Task 10: Delete frontend catalog + wire ChatContainer to useChatModels'
status: completed
type: task
priority: high
tags:
    - chat
    - frontend
created_at: 2026-05-14T07:36:53Z
updated_at: 2026-05-14T07:51:28Z
blocked_by:
    - pawrrtal-k63i
---

Delete PAWRRTAL_MODELS, ChatModelId, CHAT_MODEL_IDS, DEFAULT_CHAT_MODEL_ID from features/chat/constants.ts. Hoist useChatModels() into ChatContainer and widen ChatComposer / ChatView model props to plain string. Persisted-state validator switches from union allowlist to isCanonicalModelId; stale legacy IDs fall back silently to the catalog default. Per docs/plans/2026-05-14-model-id-canonical-format-and-catalog.md Task 10.
