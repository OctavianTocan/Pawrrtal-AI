---
# pawrrtal-4ucp
title: Build API key management endpoints
status: todo
type: task
priority: normal
tags:
    - Sprint-C
    - backend
created_at: 2026-02-27T16:09:47Z
updated_at: 2026-03-07T22:26:30Z
parent: pawrrtal-ntkp
---

APIKey model with Fernet encryption already exists in models.py. Remaining work:

- [ ] Create CRUD in app/crud/api_keys.py
- [ ] Create POST/GET/DELETE /api/v1/settings/api-keys endpoints
- [ ] GET returns {provider, is_set} — never the actual key
