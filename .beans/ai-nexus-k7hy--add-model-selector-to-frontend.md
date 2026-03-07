---
# ai-nexus-k7hy
title: Wire existing ModelSelector into ChatContainer
status: todo
type: task
priority: high
tags:
    - Sprint-B
    - frontend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-07T22:25:43Z
parent: ai-nexus-7k7w
---

Full ModelSelector component suite already exists in components/ai-elements/model-selector.tsx (dialog, trigger, search, provider logos). Remaining work:

- [ ] Create useModels hook to fetch from GET /api/v1/models
- [ ] Wire ModelSelector into ChatContainer
- [ ] Pass model_id with chat requests
- [ ] Add model badge to messages
