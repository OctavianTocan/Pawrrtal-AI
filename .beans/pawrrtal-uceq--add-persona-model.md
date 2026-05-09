---
# pawrrtal-uceq
title: Add Persona model
status: scrapped
type: task
priority: high
tags:
    - Sprint-A
    - backend
created_at: 2026-02-27T16:09:34Z
updated_at: 2026-03-07T21:29:53Z
parent: pawrrtal-9ygz
---

Add Persona table: name, system_prompt, model, icon, is_builtin. Nullable user_id (NULL = built-in).

## Reasons for Scrapping

Persona system deemed overengineered. Replaced with simple per-user custom_instructions field on UserSettings (like ChatGPT's Custom Instructions).
