---
# pawrrtal-fth4
title: Create route page components
status: scrapped
type: task
priority: high
created_at: 2026-03-26T17:28:38Z
updated_at: 2026-05-07T16:25:21Z
parent: pawrrtal-id67
blocked_by:
    - pawrrtal-hogv
---

Plan Task 4. Convert all 6 Next.js pages to client components for TanStack Router.

## Files
- Create: `frontend/src/routes/root-page.tsx` — new conversation (UUID gen, ChatContainer)
- Create: `frontend/src/routes/conversation-page.tsx` — existing conversation (useAuthedQuery for messages)
- Create: `frontend/src/routes/login-page.tsx` — login form with optional test user env vars
- Create: `frontend/src/routes/signup-page.tsx` — signup form
- Create: `frontend/src/routes/dashboard-page.tsx` — copy from app/(app)/dashboard/page.tsx
- Create: `frontend/src/routes/dev-access-requests-page.tsx` — copy from app/dev/access-requests/page.tsx

## Key Conversions
- Root page: `crypto.randomUUID()` moves from server to client (same API, works in browsers)
- ConversationPage: `cookies()` + server fetch → `useAuthedQuery()` (same pattern as sidebar)
- Login page: `process.env.TEST_USER_EMAIL` → `import.meta.env.VITE_TEST_USER_EMAIL`

## Steps
- [ ] Create root-page.tsx — useMemo for UUID, render ChatContainer
- [ ] Create conversation-page.tsx — useParams + useAuthedQuery for messages
- [ ] Create login-page.tsx — LoginForm with Vite env vars for test user
- [ ] Create signup-page.tsx — SignupForm wrapper
- [ ] Create dashboard-page.tsx — copy existing page, remove Next.js imports
- [ ] Create dev-access-requests-page.tsx — copy existing page
- [ ] Verify: tsc --noEmit
- [ ] Commit

## Reasons for Scrapping

User confirmed 2026-05-07: the Vite + TanStack Router migration is not happening. Closing the cluster — see pawrrtal-id67.
