---
# ai-nexus-3hfm
title: Add history reader and utility agent factories to agents.py
status: completed
type: task
priority: high
created_at: 2026-03-04T23:40:06Z
updated_at: 2026-03-04T23:56:35Z
parent: ai-nexus-pva0
---

Extract the two ad-hoc Agent() calls in conversations.py into dedicated factory functions in app/core/agents.py:

- create_history_reader() — Agent(db=agno_db), used for fetching chat history (line 48)
- create_utility_agent() — Agent(model=Gemini(...)), used for one-shot tasks like title generation (line 83)

Then update conversations.py to import and use these instead of inline construction. Removes the last direct agno imports from the route files.

## Summary of Changes

Added create_history_reader_agent() and create_utility_agent() to app/core/agents.py. Updated conversations.py to import and use these factories instead of constructing agents inline. Removed stale agno imports from conversations.py.
