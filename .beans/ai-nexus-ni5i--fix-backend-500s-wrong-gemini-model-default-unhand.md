---
# ai-nexus-ni5i
title: 'Fix backend 500s: wrong Gemini model default + unhandled Gemini errors'
status: in-progress
type: bug
created_at: 2026-05-06T21:24:05Z
updated_at: 2026-05-06T21:24:05Z
---

Two 500 errors: (1) chat.py has _DEFAULT_MODEL='gemini-3-flash-preview' (invalid, introduced in PR #104 channel abstraction); should be 'gemini-2.5-flash-preview-05-20' matching factory.py. (2) generate_conversation_title has no try/except around generate_text_once — Gemini API errors propagate as 500 instead of graceful fallback.
