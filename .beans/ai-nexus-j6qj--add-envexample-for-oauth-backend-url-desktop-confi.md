---
# ai-nexus-j6qj
title: Add .env.example for OAuth + BACKEND_URL desktop config
status: todo
type: task
priority: normal
created_at: 2026-05-05T06:09:57Z
updated_at: 2026-05-05T06:09:57Z
---

Several env vars introduced this session don't have a documented .env.example entry. New devs running \`just dev\` won't know which keys exist or what they're for.

**Vars to document** (in \`backend/.env.example\` or a new top-level \`.env.example\`):

OAuth:
- \`GOOGLE_OAUTH_CLIENT_ID\` (Google Cloud Console → OAuth credentials)
- \`GOOGLE_OAUTH_CLIENT_SECRET\`
- \`GOOGLE_OAUTH_REDIRECT_URI\` (default http://localhost:8000/api/v1/auth/oauth/google/callback)
- \`APPLE_OAUTH_CLIENT_ID\` (Services ID, not the App ID)
- \`APPLE_OAUTH_TEAM_ID\` (10-char Team ID from Apple Developer)
- \`APPLE_OAUTH_KEY_ID\` (10-char Key ID for the .p8)
- \`APPLE_OAUTH_PRIVATE_KEY\` (PEM contents of the .p8 file, with \\n preserved)
- \`APPLE_OAUTH_REDIRECT_URI\`
- \`OAUTH_POST_LOGIN_REDIRECT\` (default http://localhost:3001/)

Desktop:
- \`BACKEND_URL\` (default http://localhost:8000) — read by \`electron/src/server.ts\` and injected into the spawned Next.js standalone server's env

Docs:
- \`CSC_LINK\` / \`CSC_KEY_PASSWORD\` for code signing (cross-ref the signing bean)
- \`APPLE_ID\` / \`APPLE_APP_SPECIFIC_PASSWORD\` for notarization

## Todo
- [ ] Update or create .env.example with the OAuth block
- [ ] Document BACKEND_URL in electron/README.md (already mentioned but should be explicit example)
- [ ] Cross-reference signing keys without committing them
