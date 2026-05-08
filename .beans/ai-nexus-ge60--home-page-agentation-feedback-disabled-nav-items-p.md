---
# ai-nexus-ge60
title: 'Home page Agentation feedback: disabled nav items + placeholder timing'
status: completed
type: task
priority: normal
created_at: 2026-05-07T20:43:25Z
updated_at: 2026-05-07T20:43:46Z
---

Disable Gift AI Nexus and Get apps dropdown items visually; slow composer placeholder rotation.



## Summary of Changes

- `frontend/components/nav-user.tsx`: Set `disabled` on **Get apps and extensions** and **Gift AI Nexus** dropdown items so they render as non-interactive and muted.
- `frontend/features/chat/components/ChatComposer.tsx`: Increased `PLACEHOLDER_ROTATION_INTERVAL_MS` from 3200ms to 5200ms for slower empty-composer tip rotation.
