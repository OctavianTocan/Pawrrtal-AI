---
# ai-nexus-09zm
title: 'Apple OAuth callback: sign client_secret JWT with .p8 key'
status: todo
type: feature
priority: normal
created_at: 2026-05-05T06:08:42Z
updated_at: 2026-05-05T06:08:42Z
---

The Google OAuth flow is fully wired (start + callback + user create + session cookie). The Apple flow ships only the **start endpoint** (redirects to consent screen). The callback returns 501 until the JWT-signed client_secret is implemented.

**What's needed.**
- Generate the Apple client_secret JWT per spec: header `{ alg: ES256, kid: APPLE_OAUTH_KEY_ID }`, claims `{ iss: APPLE_OAUTH_TEAM_ID, iat, exp (≤6 months), aud: 'https://appleid.apple.com', sub: APPLE_OAUTH_CLIENT_ID }`, signed with the .p8 ECDSA key.
- Use `PyJWT` + `cryptography` (already in backend deps via fastapi-users → cryptography).
- Implement `_exchange_apple_code(code)` mirroring `_exchange_google_code` in `backend/app/api/oauth.py`: POST to `https://appleid.apple.com/auth/token` with `client_id`, the signed `client_secret`, `code`, `grant_type=authorization_code`, `redirect_uri`. Verify the returned `id_token` (RS256, key from `https://appleid.apple.com/auth/keys`).
- Wire callback to `_login_or_create_user(email)` + `_issue_session_cookie` like the Google one.
- Add `pytest.mark.anyio` test using a static .p8 fixture + mocked Apple endpoints.

**Reference.** https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens

## Todo
- [ ] Add `_sign_apple_client_secret(now)` helper
- [ ] Implement `_exchange_apple_code(code)`
- [ ] Verify Apple `id_token` (RS256, JWKS rotation)
- [ ] Wire callback handler (replace 501 stub)
- [ ] Test fixture using a throwaway .p8
- [ ] Add `.env.example` entries for the four APPLE_OAUTH_* vars
