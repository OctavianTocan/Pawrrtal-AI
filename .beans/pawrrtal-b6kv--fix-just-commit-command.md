---
# pawrrtal-b6kv
title: Fix just commit command
status: completed
type: bug
priority: high
created_at: 2026-05-16T22:58:30Z
updated_at: 2026-05-16T23:00:38Z
---

Diagnose and fix the just commit recipe / backend commit CLI so the repo's standard auto-commit flow works again, then use it to commit the current staged work and push after rebasing onto origin/development.

## Summary of Changes

- Diagnosed  failure as an obsolete Gemini model ID:  now returns 404 from the Google GenAI API.
- Updated the commit CLI to default to the live  model and allow override through .
- Verified commit-message generation succeeds with the replacement model.

## Summary Correction

The shell stripped inline command names from the prior summary while updating the bean. The concrete diagnosis is: `just commit` was pinned to obsolete model `gemini-2.5-flash-preview-05-20`; the fix changed the default to `gemini-2.5-flash` and added `COMMIT_AGENT_MODEL` as an override.
