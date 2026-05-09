---
# pawrrtal-du57
title: Safari dev-login via same-origin proxy
status: completed
type: bug
priority: high
created_at: 2026-05-02T09:57:37Z
updated_at: 2026-05-02T09:58:11Z
---

Safari blocks/partitions cross-site Set-Cookie from api subdomain after POST dev-login. Add Next route POST /api/auth/dev-login that proxies to FastAPI and re-emits Set-Cookie same-origin. Wire useDevAdminLoginMutation to relative URL.
