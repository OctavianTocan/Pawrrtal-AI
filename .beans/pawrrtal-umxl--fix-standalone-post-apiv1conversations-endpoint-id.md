---
# pawrrtal-umxl
title: Fix standalone POST /api/v1/conversations endpoint (id now required on schema)
status: scrapped
type: task
priority: normal
tags:
    - Backend
    - Sprint 3
created_at: 2026-02-27T15:01:39Z
updated_at: 2026-03-07T22:25:20Z
---

Notion Task #78 — Fix standalone POST /api/v1/conversations endpoint. The id field is now required on the schema but the endpoint needs to handle this properly. Status: Not Started. Priority: Medium.

## Reasons for Scrapping

Issue no longer exists — ConversationCreate.id is Optional[uuid.UUID] = None. The fix is already in place.
