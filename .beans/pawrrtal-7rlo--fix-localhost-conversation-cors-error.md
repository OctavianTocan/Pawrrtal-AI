---
# pawrrtal-7rlo
title: Fix localhost conversation CORS error
status: completed
type: bug
priority: normal
created_at: 2026-05-02T23:23:00Z
updated_at: 2026-05-02T23:34:33Z
---

## Goal

Fix browser CORS failures when the frontend on localhost:3001 fetches backend conversation endpoints on localhost:8000.

## Checklist

- [x] Inspect frontend API fetch configuration
- [x] Inspect backend CORS middleware settings
- [x] Patch the minimal CORS/origin mismatch
- [x] Verify backend response includes CORS headers for localhost:3001

## Summary of Changes

Wrapped the exported FastAPI ASGI app with CORSMiddleware globally instead of installing CORS only as normal FastAPI middleware. This keeps Access-Control-Allow-Origin present for localhost:3001 even when backend exceptions produce 500 responses, preventing the browser from masking real backend errors as missing CORS headers. Verified normal ASGI responses, forced 500 responses, and backend compileall.
