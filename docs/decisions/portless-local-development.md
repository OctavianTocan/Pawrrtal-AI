---
title: Portless for local frontend and API
status: accepted
date: 2026-05-02
---

# Decision: Portless for local frontend and API

## Context

- The Next.js app is served in dev over **HTTPS** via Portless (stable hostname, e.g. `app.nexus-ai.localhost`).
- The FastAPI backend is **not** an npm workspace package; only `frontend/` is listed under Bun `workspaces`.
- Browsers **block mixed content**: an HTTPS page cannot reliably call an **HTTP** API (e.g. `http://localhost:8000`).

## Decision

1. **Frontend** — Use Portless in line with [vercel-labs/portless](https://github.com/vercel-labs/portless): root `portless.json` maps the workspace package (`frontend`) to the real dev command (`dev:app` → `next dev`), with `turbo: false` because we do not use Turborepo. Root entry: `bunx portless`.

2. **Backend** — Run FastAPI **through Portless** under a subdomain (e.g. `api.app.nexus-ai` → `https://api.app.nexus-ai.localhost`) so the browser can call the API over **HTTPS** from an HTTPS UI without mixed-content blocking.

3. **`portless.json` scope** — Include **only** JavaScript workspace apps. Do **not** try to register the Python backend there; orchestration lives in `dev.ts` and `package.json` scripts (`dev:backend`).

4. **Orchestration** — Keep `dev.ts` for starting workspace Portless plus the API subprocess, and for waiting until the HTTPS route responds before auto-opening the browser (avoids Portless’s stub 404 during registration).

### Safari and session cookies (dev-login)

The UI runs on **`app.*`** and the API on **`api.*`** — different sites in the browser. If the client **`fetch`**es **`POST https://api…/auth/dev-login`** directly, the response’s **`Set-Cookie`** is treated as **cross-site**. **Safari** (and strict third-party cookie behavior) often **does not store** that cookie for later requests from the app, so you can see **204** and headers in the Network tab but **stay on the login page**.

**Mitigation:** **`POST /api/auth/dev-login`** on the Next app (same origin as the page). The route handler calls FastAPI and **replays upstream `Set-Cookie`** on its own response so the browser attributes the session cookie to **`app.*`**. **`useDevAdminLoginMutation`** uses that relative path instead of **`API_BASE_URL`**.

## Alternatives considered

- **HTTP everywhere in dev** — No Portless on the frontend; UI and API on `localhost` HTTP. Rejected for now because we want stable named HTTPS URLs for local dev and parity with TLS-related behavior.
- **Next.js-only proxy to FastAPI** — Browser hits same origin; Next proxies to `localhost:8000`. Valid pattern but would require API URL / routing changes; not chosen as the primary approach today.

## References

- `portless.json` — workspace app map and `turbo: false`.
- `dev.ts` — dual-process dev + HTTPS readiness check + browser open.
- `frontend/package.json` — `dev` / `dev:app` / `portless` block aligned with upstream Turborepo-style docs.
- `frontend/lib/api.ts` — default API base URL aligned with Portless API hostname when unset.
- `frontend/app/api/auth/dev-login/route.ts` — same-origin proxy for dev-login **`Set-Cookie`** (Safari).

## Review

Revisit if we drop HTTPS for the UI in dev, introduce Turborepo, or move API traffic behind a same-origin Next proxy.
