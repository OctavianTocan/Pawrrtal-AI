---
# pawrrtal-yfa2
title: 'Vercel frontend → remote backend: workspace ''Connect to remote server'' wiring'
status: todo
type: feature
priority: normal
created_at: 2026-05-07T16:19:24Z
updated_at: 2026-05-07T16:19:24Z
---

## Goal

Today the frontend default-fetches against the local ``http://localhost:8000`` backend (via ``NEXT_PUBLIC_API_URL`` in ``frontend/lib/api.ts``). For a Vercel-deployed frontend pointing at a VPS-deployed backend, we need a clean way to set the API base URL — and the existing onboarding "Connect to remote server" button (``frontend/features/onboarding/onboarding-create-workspace-step.tsx:39``) is the natural UX hook.

## Two distinct things

1. **Build-time config** — Vercel deploys need ``NEXT_PUBLIC_API_URL`` baked at build (or read via ``getServerSideProps``-style runtime config). Document the recipe: env var on the Vercel project + on the VPS that runs FastAPI. CORS allowlist on the backend side has to include the Vercel origin.

2. **Runtime user choice** — the "Connect to remote server" button in the workspace step lets a user point their frontend at a *different* backend (their own VPS, a friend's instance). For this to work, we need:
   - A field for the user to type the backend URL.
   - A connectivity check (``GET /healthz`` or similar).
   - Persisted in localStorage as the active API base; a small util in ``frontend/lib/api.ts`` reads it before falling back to the build-time env var.
   - All ``useAuthedFetch`` / ``useAuthedQuery`` callers automatically pick it up because they go through ``API_BASE_URL``.

## Security notes

- The user's pasted URL is treated as untrusted: validate as a URL, scheme must be ``https://`` in production, allow ``http://localhost``/``127.0.0.1`` in dev only.
- We never send credentials to a backend the user hasn't explicitly chosen; cookie auth means the cookie is only sent same-origin anyway, so cross-origin remote backend needs a CORS-friendly auth scheme (Bearer token from a Login request to the chosen backend).
- Document that switching the active backend logs the user out of the previous one.

## Acceptance

- Vercel-deployed frontend can set ``NEXT_PUBLIC_API_URL`` and reach a VPS-deployed FastAPI.
- The onboarding "Connect to remote server" option opens a sheet with a URL input + connect button; on success, the API base is persisted and the user lands on a fresh login flow against that backend.
- Switching between local and remote works without a restart.
- CORS, cookies, and auth survive the remote case.

## Todos

- [ ] Document Vercel + VPS build-time config recipe in ``electron/README.md`` or a new ``docs/deployment.md``
- [ ] Build the connect-to-remote-server sheet UI (URL input, validate, healthcheck, persist)
- [ ] Update ``frontend/lib/api.ts`` to honour a localStorage override
- [ ] Update backend CORS allowlist to be configurable via env var
- [ ] Add a logged-in indicator showing which backend you're connected to (small chip in the user dropdown)
- [ ] Tests: changing the URL and asserting subsequent fetches go to the new origin

## Related

- Discussed alongside Telegram connect flow → both surfaces care about cross-origin cookie behaviour. The Portless cleanup beans (pawrrtal-7xpf, aluo, 6ve4) are stale per the recent localhost-only direction; once those are closed, this becomes the canonical "remote backend" path.
