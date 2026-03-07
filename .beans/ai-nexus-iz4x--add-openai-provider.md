---
# ai-nexus-iz4x
title: Add OpenAI provider
status: scrapped
type: task
priority: high
tags:
    - Sprint-B
    - backend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-07T22:09:32Z
parent: ai-nexus-7k7w
---

Create OpenAIProvider adapter using agno.models.openai.OpenAIChat. Register in provider registry. Models: gpt-4o, gpt-4o-mini, o3-mini.

## Reasons for Scrapping

Agno already has agno.models.openai.OpenAIChat adapter built-in. Just need to `pip install openai` and add a dict entry in the model mapping.
