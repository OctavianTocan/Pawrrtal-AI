---
# pawrrtal-pva0
title: 'Epic 1: Backend Restructure'
status: completed
type: epic
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:02Z
updated_at: 2026-03-04T23:57:11Z
parent: pawrrtal-ily6
---

Modularize monolithic main.py into api/, core/ modules. Create config module (pydantic-settings), API router, extract conversation routes, extract chat endpoint, create agent factory, slim main.py to app factory.

## Summary of Changes

All 6 child tasks completed:
- Pydantic-settings config module (pawrrtal-126i)
- App factory pattern in main.py (pawrrtal-np7j)
- API router + conversation route extraction (pawrrtal-dsg3)
- Chat endpoint + agent factory extraction (pawrrtal-fxhs)
- History reader & utility agent factories (pawrrtal-3hfm)
- GOOGLE_API_KEY in Settings (pawrrtal-c97h)

Backend is now fully modular: main.py is a slim app factory, routes live in api/, agent construction in core/agents.py, config in core/config.py.
