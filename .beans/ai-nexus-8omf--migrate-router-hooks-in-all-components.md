---
# ai-nexus-8omf
title: Migrate router hooks in all components
status: todo
type: task
priority: high
created_at: 2026-03-26T17:29:00Z
updated_at: 2026-03-26T17:29:00Z
parent: ai-nexus-id67
blocked_by:
    - ai-nexus-ow61
---

Plan Task 6. Replace all next/navigation imports with TanStack Router equivalents.

## Files to Modify (7 files + useAppRouter)
- `frontend/hooks/use-app-router.ts` — rewrite: useNavigate + useLocation from @tanstack/react-router
- `frontend/hooks/use-authed-fetch.ts` — useRouter → useNavigate
- `frontend/components/new-sidebar.tsx` — useRouter → useAppRouter
- `frontend/components/conversation-sidebar-item.tsx` — useRouter/usePathname → useAppRouter
- `frontend/components/nav-chats.tsx` — useRouter → useAppRouter
- `frontend/components/login-form.tsx` — useRouter → useAppRouter
- `frontend/components/signup-form.tsx` — useRouter → useAppRouter
- `frontend/features/chat/ChatContainer.tsx` — useRouter → useAppRouter

## Pattern
Most components already use useAppRouter() from the earlier abstraction. Those just need the hook rewritten — the call sites stay the same.

Files that directly import next/navigation need the import swapped.

## Steps
- [ ] Rewrite use-app-router.ts — useNavigate + useLocation from @tanstack/react-router
- [ ] Update use-authed-fetch.ts — useRouter → useNavigate, router.replace → navigate({ to, replace })
- [ ] Update each of the 6 component files — swap imports
- [ ] Grep verify: `grep -r "next/navigation" frontend/components/ frontend/features/ frontend/hooks/` returns zero
- [ ] Verify: tsc --noEmit
- [ ] Commit

## Note
This can run in parallel with Tasks 2-4 since it only needs @tanstack/react-router installed (Task 1). But verifying the full app requires Task 4 (entry point) to be done.
