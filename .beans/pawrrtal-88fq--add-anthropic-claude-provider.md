---
# pawrrtal-88fq
title: Add Anthropic Claude provider
status: scrapped
type: task
priority: high
tags:
    - Sprint-B
    - backend
created_at: 2026-02-27T16:09:41Z
updated_at: 2026-03-07T22:09:31Z
parent: pawrrtal-7k7w
---

Create AnthropicProvider adapter using agno.models.anthropic.Claude. Register in provider registry. Models: claude-sonnet-4-6, claude-haiku-4-5.

## Reasons for Scrapping

Agno already has agno.models.anthropic.Claude adapter built-in. Just need to `pip install anthropic` and add a dict entry in the model mapping.
