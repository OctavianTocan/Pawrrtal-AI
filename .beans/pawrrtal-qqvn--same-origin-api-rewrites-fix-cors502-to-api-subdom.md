---
# pawrrtal-qqvn
title: 'Same-origin API rewrites: fix CORS/502 to api subdomain in dev'
status: scrapped
type: bug
priority: normal
created_at: 2026-05-02T20:10:44Z
updated_at: 2026-05-07T16:29:46Z
---

Browser fetch to api.app hits Portless+CORS; rewrite /api/v1 and /auth paths to loopback FastAPI. Empty NEXT_PUBLIC_API_URL default; server URLs from request host. Fix use-chat path.
