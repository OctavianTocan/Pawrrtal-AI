---
# ai-nexus-ffk4
title: Define provider interface and Gemini adapter
status: scrapped
type: task
priority: high
tags:
    - Sprint-B
    - backend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-07T22:09:29Z
parent: ai-nexus-7k7w
---

Create base ModelProvider ABC in core/providers/base.py. Implement GeminiProvider. Create provider registry with get_provider() and list_providers().

## Reasons for Scrapping

Agno already provides the provider abstraction — each provider is just a different import (agno.models.anthropic, agno.models.openai, etc.). No need for a custom ModelProvider ABC or registry.
