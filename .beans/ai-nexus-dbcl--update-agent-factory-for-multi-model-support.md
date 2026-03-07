---
# ai-nexus-dbcl
title: Update agent factory for multi-model support
status: todo
type: task
priority: high
tags:
    - Sprint-B
    - backend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-07T22:09:36Z
parent: ai-nexus-7k7w
---

Simplified approach — Agno already handles provider abstraction:

- Add MODEL_MAP dict mapping model_id strings to Agno model classes (Gemini, Claude, OpenAIChat)
- Update create_agent() to accept model_id + optional api_key, look up from MODEL_MAP
- Update ChatRequest schema to include optional model_id field
- Add GET /api/v1/models endpoint returning hardcoded list of supported models
- Install anthropic and openai SDKs as dependencies (Agno adapters require underlying SDKs)
