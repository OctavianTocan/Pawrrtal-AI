---
# ai-nexus-9h84
title: Wire message action primitives into ChatView
status: todo
type: task
priority: normal
tags:
    - Sprint-D
    - frontend
created_at: 2026-02-27T16:09:59Z
updated_at: 2026-03-07T22:25:43Z
parent: ai-nexus-omen
---

MessageActions, MessageAction, and MessageToolbar primitives already exist in components/ai-elements/message.tsx. Remaining work:

- [ ] Add MessageActions to ChatView message rendering
- [ ] Implement copy handler (clipboard API)
- [ ] Implement regenerate handler (re-send last user message)
- [ ] Implement edit handler (put message back in input)
