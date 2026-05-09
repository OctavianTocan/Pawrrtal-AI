---
# pawrrtal-fxhs
title: Extract chat endpoint and create agent factory
status: completed
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:27Z
updated_at: 2026-03-04T23:44:48Z
parent: pawrrtal-pva0
---

Create backend/app/api/chat.py and backend/app/core/agents.py. Move SSE streaming logic and Agno agent creation out of main.py.



## Notes from Agno Template

- Agno DB singleton (SqliteDb/PostgresDb) should live in the agent factory module, not main.py
- Agent factory should support standalone testing with `if __name__ == "__main__":` pattern
- Each agent module is self-contained: imports db, defines instructions, creates agent
- Factory pattern needed (vs Agno's static singletons) because we create per-user/session agents

## Summary of Changes

Chat endpoint extracted to app/api/chat.py, agent factory created in app/core/agents.py with agno_db singleton and create_agent(user_id, conversation_id) function. Includes standalone __main__ test pattern. chat.py imports create_agent instead of constructing agents inline.
