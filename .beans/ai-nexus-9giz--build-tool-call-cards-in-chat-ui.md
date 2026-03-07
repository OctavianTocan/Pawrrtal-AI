---
# ai-nexus-9giz
title: Wire existing tool cards into chat SSE stream
status: todo
type: task
priority: normal
tags:
    - Sprint-E
    - frontend
created_at: 2026-02-27T16:10:03Z
updated_at: 2026-03-07T22:25:43Z
parent: ai-nexus-sady
---

Tool card UI already built in components/ai-elements/tool.tsx (collapsible, status badges, animations). Remaining work:

- [ ] Add tool call events to SSE stream in chat.py
- [ ] Parse tool events in use-chat.ts
- [ ] Render existing Tool components in ChatView
