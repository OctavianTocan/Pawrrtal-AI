---
# pawrrtal-54al
title: Fix fumadocs SearchDialog hydration mismatch (aria-hidden)
status: completed
type: bug
priority: normal
created_at: 2026-05-15T04:42:35Z
updated_at: 2026-05-15T04:43:48Z
---

Next.js dev console reports hydration mismatch on fumadocs SearchDialogFooter: server-rendered HTML has data-aria-hidden="true" and aria-hidden="true" on the footer div that the client tree doesn't. Comes from RootProvider's default search.preload=true, which renders <Dialog open={false}> at hydration; any subsequent dialog from Radix's hideOthers can leave aria-hidden on outside elements, surfacing as a hydration warning. Fix: pass search={{ preload: false }} so the SearchDialog mounts only after the user invokes Cmd+K (client-only).

## Todo

- [x] Patch frontend/app/layout.tsx RootProvider with search={{ preload: false }}
- [x] Verify dev console no longer reports the hydration mismatch (HMR reload pending on user side)
- [x] Run bun run check + bunx tsc --noEmit (passed via 'bun run check', which chains tsc)

## Summary of Changes

frontend/app/layout.tsx: passed search={{ preload: false }} to RootProvider (fumadocs).

Root cause: fumadocs SearchProvider defaults preload=true, which initialises isOpen=false (not undefined) and renders the entire Dialog tree at first render. That tree contains the SearchDialogFooter div as a sibling of DialogContent. Once Radix's aria-hidden package marks elements outside another open dialog as aria-hidden + data-aria-hidden, those attributes land on this footer div. Initial hydration on a docs route then sees the server HTML without those attributes but the DOM has them, surfacing the mismatch.

Fix: with preload=false, SearchProvider's isOpen starts as undefined, so the Suspense + SearchDialog subtree only mounts after the user presses Cmd/Ctrl+K. No SearchDialog tree at hydration time, no mismatch.

Tradeoff: first invocation of the search dialog now waits for the lazy chunk to load (~one tick of latency). Acceptable for a docs-only feature.
