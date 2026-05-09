---
# pawrrtal-6ve4
title: Configure subdomain auth and CORS for local Portless and production
status: scrapped
type: task
priority: high
tags:
    - Backend
    - Frontend
    - Auth
    - DevOps
    - CORS
    - Portless
created_at: 2026-03-16T17:15:24Z
updated_at: 2026-05-07T16:21:28Z
parent: pawrrtal-sx1v
blocked_by:
    - pawrrtal-bsgu
---

Document and implement the subdomain-based auth/CORS setup so Pawrrtal works in both local Portless development and production without redirect loops after login.

## Goal

Support this shape reliably:

- Local frontend: `http://pawrrtal.localhost:1355`
- Local backend: `http://api.pawrrtal.localhost:1355`
- Production frontend: `https://pawrrtal.com`
- Production backend: `https://api.pawrrtal.com`

The login flow must work with HTTP-only cookies, frontend route protection, and backend API calls in both environments.

## Why this is needed

Current auth assumes the browser can receive a session cookie from the backend and later send that cookie on requests to the frontend domain. That breaks if the frontend and backend use different host families, even if CORS is configured correctly.

Important rules:

- `localhost` and `pawrrtal.localhost` are different cookie hosts
- cookies do not care about port, but they do care about host/domain
- CORS alone does not solve cookie visibility between sibling subdomains
- `allow_credentials=True` means backend CORS cannot use `*` for origins

## Recommended architecture

Use sibling subdomains in both local and production, and scope the auth cookie to the shared parent domain:

- Local cookie domain: `pawrrtal.localhost`
- Production cookie domain: `pawrrtal.com`

This keeps local behavior structurally similar to production instead of relying on a special-case proxy-only auth flow.

## Local Portless setup

### Frontend

Run the frontend with Portless so it gets a stable browser-facing hostname:

```text
portless pawrrtal <frontend dev command>
```

Expected frontend URL:

```text
http://pawrrtal.localhost:1355
```

### Backend

Run the backend on a sibling Portless subdomain:

```text
portless api.pawrrtal <backend dev command>
```

Expected backend URL:

```text
http://api.pawrrtal.localhost:1355
```

### Local environment values

- Frontend `NEXT_PUBLIC_API_URL=http://api.pawrrtal.localhost:1355`
- Backend `CORS_ORIGINS=["http://pawrrtal.localhost:1355"]`
- Backend `COOKIE_DOMAIN=pawrrtal.localhost`
- Backend `ENV=dev`
- Backend cookie must keep `Secure=False` for local HTTP development

### Expected behavior

- Browser posts login credentials from `pawrrtal.localhost` to `api.pawrrtal.localhost`
- backend responds with `Set-Cookie` for `Domain=pawrrtal.localhost`
- cookie becomes available to both `pawrrtal.localhost` and `api.pawrrtal.localhost`
- frontend route guard can see `session_token` after redirect

## Production setup

### Production URLs

- Frontend: `https://pawrrtal.com`
- Backend: `https://api.pawrrtal.com`

### Production environment values

- Frontend `NEXT_PUBLIC_API_URL=https://api.pawrrtal.com`
- Backend `CORS_ORIGINS=["https://pawrrtal.com"]`
- Backend `COOKIE_DOMAIN=pawrrtal.com`
- Backend `ENV=prod`
- Backend cookie must use `Secure=True`

### Cookie policy

- `HttpOnly=True`
- `Secure=True` in production
- `SameSite="lax"` should be sufficient because frontend and backend remain same-site sibling subdomains
- avoid `SameSite=None` unless a true cross-site embedding/use case appears later

## Backend changes required

- `backend/app/core/config.py`
  - add `cors_origins`
  - add `cookie_domain`
  - document expected env formats
- `backend/main.py`
  - stop hardcoding `http://localhost:3001`
  - load `allow_origins` from settings
- `backend/app/users.py`
  - pass `cookie_domain=settings.cookie_domain` into `CookieTransport`
  - keep `cookie_secure` environment-sensitive

## Frontend changes required

- `frontend/lib/api.ts`
  - use environment-specific backend URL
- confirm login/signup flows always call the backend using the subdomain-matched API base URL
- confirm frontend route guard continues reading the same `session_token` cookie name

## Environment format recommendation

Prefer `list[str]` in settings with JSON-array env values:

```text
CORS_ORIGINS=["http://pawrrtal.localhost:1355"]
```

and:

```text
CORS_ORIGINS=["https://pawrrtal.com"]
```

This avoids ambiguous comma-splitting behavior in environment parsing.

## Pitfalls to avoid

- Do not mix `localhost` frontend URLs with `*.localhost` backend URLs for cookie auth
- Do not use `allow_origins=["*"]` when `allow_credentials=True`
- Do not assume Portless wildcard subdomain routing solves cookies by itself; cookie domain still must be configured
- Do not scope the production cookie to `pawrrtal.com` unless cross-product auth sharing is explicitly intended

## Acceptance criteria

- local login from `http://pawrrtal.localhost:1355/login` redirects successfully to `/`
- backend requests from the frontend include the session cookie in local Portless mode
- production config supports `pawrrtal.com` -> `api.pawrrtal.com` auth with the same cookie-based flow
- CORS configuration is environment-driven, not hardcoded

## Related

- `pawrrtal-bsgu` covers configurable CORS origins only
- this bean expands that work to include cookie-domain strategy, Portless local subdomains, and production subdomain deployment

## Reasons for Scrapping

Portless was removed from local dev — see pawrrtal-7xpf. The 'remote backend' direction now lives under pawrrtal-yfa2 (Vercel + VPS) rather than subdomain Portless.
