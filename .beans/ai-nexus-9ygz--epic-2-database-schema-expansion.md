---
# ai-nexus-9ygz
title: 'Epic 2: Database Schema Expansion'
status: completed
type: epic
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:02Z
updated_at: 2026-03-07T22:03:14Z
parent: ai-nexus-ily6
---

Add new tables: UserPreferences, ApiKey (encrypted). Add custom_instructions text field to UserPreferences (replaces the Persona concept). All FKs use ondelete=CASCADE. ToolEvent and Conversation model field scrapped — Agno already stores tool calls and model info natively in agno_sessions.

## Visual Reference

Open the schema expansion diagram in your browser:
```bash
open ~/.agent/diagrams/epic-2-schema-expansion.html
```

## Summary of Changes

- Added UserPreferences model (user_id as PK, custom_instructions, accent_color, font_size)
- Added APIKey model with Fernet encryption via sqlalchemy-utils
- Added ondelete=CASCADE to all user FKs (Conversation, UserPreferences, APIKey)
- Scrapped Persona model, ToolEvent model, and Conversation model field — Agno handles those natively
- DB initialization already works via side-effect import in db.py
