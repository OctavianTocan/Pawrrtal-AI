---
# ai-nexus-fxhs
title: Extract chat endpoint and create agent factory
status: todo
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:27Z
updated_at: 2026-03-04T10:01:49Z
parent: ai-nexus-pva0
---

Create backend/app/api/chat.py and backend/app/core/agents.py. Move SSE streaming logic and Agno agent creation out of main.py.



## Notes from Agno Template

- Agno DB singleton (SqliteDb/PostgresDb) should live in the agent factory module, not main.py
- Agent factory should support standalone testing with `if __name__ == "__main__":` pattern
- Each agent module is self-contained: imports db, defines instructions, creates agent
- Factory pattern needed (vs Agno's static singletons) because we create per-user/session agents
