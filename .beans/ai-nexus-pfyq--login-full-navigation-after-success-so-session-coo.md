---
# ai-nexus-pfyq
title: 'Login: full navigation after success so session cookie is sent'
status: completed
type: bug
priority: normal
created_at: 2026-05-02T20:08:24Z
updated_at: 2026-05-02T20:08:34Z
---

Dev admin (and email login) used router.push; soft nav can race Set-Cookie. Use location.replace('/') after mutateAsync.

\n\n## Summary of Changes\n\n- : after successful email/password or dev-admin login, call  instead of  , so the session cookie from the login response is committed before loading  and first authed API calls (avoids 401 →  bounce).\n- Removed unused  import.
