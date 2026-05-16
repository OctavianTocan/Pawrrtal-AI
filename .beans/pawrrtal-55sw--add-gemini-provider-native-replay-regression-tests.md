---
# pawrrtal-55sw
title: Add Gemini provider-native replay regression tests
status: completed
type: task
priority: high
created_at: 2026-05-16T22:40:54Z
updated_at: 2026-05-16T22:44:09Z
---

Write failing tests and implementation TODO comments for preserving provider-native Gemini replay state, including thought_signature metadata, while keeping the agent loop provider-agnostic.

## Summary of Changes

- Added backend/tests/test_provider_native_replay_state.py with failing regression tests for provider-native replay state.
- Covered agent_loop propagation of opaque provider_state, Gemini capture of native model content with thought_signature, and Gemini replay preferring native ModelContent.
- Added TODO anchors in agent loop types, loop assembly, and Gemini provider conversion code with the Gemini thought-signatures docs reference.
