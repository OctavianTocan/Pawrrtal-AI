---
# ai-nexus-x50h
title: 'Backend: thread personalization profile into agent system prompt'
status: scrapped
type: feature
priority: normal
created_at: 2026-05-04T21:37:56Z
updated_at: 2026-05-07T16:26:02Z
blocked_by:
    - ai-nexus-dzp2
---

Wire frontend personalization profile (personality + customInstructions) through to Agno + Claude provider system prompts. Today the data is collected in onboarding + settings and persists to localStorage; backend hasn't been touched. Need: persist to user_preferences (custom_instructions field exists), read in chat endpoint, prepend to system_prompt for both providers.

## Reasons for Scrapping

User confirmed 2026-05-07: removing this. Personalization-into-system-prompt is conceptually covered by the workspace files (`USER.md`, `SOUL.md`) that `seed_workspace` already produces — landing those for real consumption belongs to ai-nexus-dmor (workspace → providers wiring) rather than a parallel system-prompt thread.
