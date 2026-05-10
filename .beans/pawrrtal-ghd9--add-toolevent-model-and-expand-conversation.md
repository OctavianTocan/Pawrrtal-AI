---
# pawrrtal-ghd9
title: Add model field to Conversation
status: scrapped
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:34Z
updated_at: 2026-03-07T21:51:35Z
parent: pawrrtal-9ygz
---

Both ToolEvent and model field scrapped — Agno already stores both natively:
- Tool calls via `store_tool_messages` (default: True)
- Model info in `agno_sessions.agent_data` JSON (id, name, provider)

## Reasons for Scrapping

Would duplicate data Agno already persists. Read it from agno_sessions when needed.
