---
# pawrrtal-ow5w
title: Update google-genai SDK to latest
status: completed
type: task
priority: high
created_at: 2026-05-16T18:37:41Z
updated_at: 2026-05-16T18:40:13Z
---

Bump the backend google-genai dependency from the locked 1.66.0 series to the current latest release and refresh uv.lock.

## Summary of Changes

Updated backend google-genai requirement to >=2.3.0, refreshed uv.lock to 2.3.0, and synced the backend virtualenv. Verified the installed package reports 2.3.0 and uv lock is current.

## Follow-up Note

Verified google-genai 2.3.0 still treats function_response parts as user-side content in SDK source; updated the Gemini regression expectation from role=tool to role=user to match the installed/latest SDK code.
