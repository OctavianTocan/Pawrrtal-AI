---
# pawrrtal-9ntw
title: Add ApiKey model with encryption
status: completed
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:33Z
updated_at: 2026-03-07T22:02:03Z
parent: pawrrtal-9ygz
---

Add ApiKey table: user_id, provider, encrypted_key, is_active. Unique constraint on (user_id, provider). Use sqlalchemy-utils StringEncryptedType with FernetEngine. Encryption key from FERNET_KEY env var via Pydantic Settings in core/config.py.

## Summary of Changes

- Added APIKey model in models.py with StringEncryptedType (FernetEngine)
- Fields: user_id (FK, CASCADE), provider, encrypted_key, is_active
- Added fernet_key to Pydantic Settings in core/config.py
- Added sqlalchemy-utils dependency
- Note: unique constraint on (user_id, provider) still TODO
