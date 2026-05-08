# Frontend stack spikes

We currently ship the frontend on Next.js (App Router, RSC, the whole
provider tree).  This directory hosts four side-by-side spikes that
implement the **same minimal chat feature** on different frontend
stacks, so we can decide whether moving off Next.js is worth it.

The existing Next.js app is **not touched**.  These are independent
apps under `spikes/<n>-<stack>/` that talk to the same backend.

## What each spike does

The minimum bar to count as "viable":

1. Hit `POST /api/v1/auth/dev-login` to set the session cookie.
2. Generate a UUID client-side, hit `POST /api/v1/conversations/{id}`
   to persist a new conversation.
3. Render a single chat surface: textarea + send button.
4. On send, hit `POST /api/v1/chat/` with `{question, conversation_id, model_id}`
   and render the streamed `delta` events as they arrive.

That's it.  No sidebar, no auth UI, no settings.  Just enough to feel
each stack's developer experience and bundle size.

## Spikes

| Dir | Stack | Why we're trying it |
| --- | ----- | ------------------- |
| `01-react-vite/` | React 19 + Vite | The "just remove Next.js" baseline. No router, single page. |
| `02-react-vite-tanstack/` | React 19 + Vite + TanStack Router | Same as 01 but with type-safe routing — what we'd reach for to replace Next's file-based routing. |
| `03-sveltekit/` | SvelteKit | Smallest bundle, signal-style reactivity, server-component story closer to what we have today. |
| `04-solid/` | Solid.js + Vite | Fine-grained reactivity, no virtual DOM, JSX feel.  Closest spiritual sibling to React without React's overhead. |

## How to compare

Each spike has its own `README.md` capturing:

- `pnpm install && pnpm dev` time
- Cold + hot bundle size of the chat page
- `pnpm build` time
- Subjective notes on the dev experience: TS DX, error messages,
  how loud the build is, how many config files we needed.

Run all four against a backend at `http://localhost:8000`.  Each
spike reads `VITE_BACKEND_URL` (or framework equivalent) so you can
point them at a deployed backend if you'd rather.

## What we're explicitly *not* trying to do

- Reproduce the full app's surface area.
- Re-implement auth flows.
- Make these production-ready.
- Win a benchmark.

We're trying to feel the dev experience and gather real numbers
before committing to a migration.

## Decision criteria (fill in after running them)

| Criterion | Next.js (current) | 01 R+V | 02 R+V+TS | 03 Svelte | 04 Solid |
| --------- | ----------------- | ------ | --------- | --------- | -------- |
| Cold install (s) | | | | | |
| Cold dev start (s) | | | | | |
| HMR roundtrip (ms) | | | | | |
| `pnpm build` (s) | | | | | |
| First-load JS (KB) | | | | | |
| Files added to wire chat | | | | | |
| Type errors out of the box | | | | | |
| Subjective rating /10 | | | | | |
