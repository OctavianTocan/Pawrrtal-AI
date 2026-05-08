# Spike 03 — SvelteKit

Same chat surface, in SvelteKit + Svelte 5 (runes).  Closest analogue
to Next.js in this list: file-based routing, can render server-side
when we want to, ships the smallest runtime of the four.

## Run

```bash
pnpm install
pnpm dev   # http://localhost:5175
```

## Why try it

- Smallest production bundles of any modern framework.
- Svelte 5 runes (`$state`, `$derived`, `$effect`) are signal-style
  reactivity without the `useEffect`/`useMemo` dance.
- SvelteKit's adapter system means we can keep client-only deploy
  (Cloudflare Pages, Vercel static) or move to SSR later without
  re-writing components.
- Real `<style>` scoping per component, no Tailwind necessary unless
  we want it.

## Files

```
package.json          # 7 dev deps
svelte.config.js      # adapter-auto + vitePreprocess
vite.config.ts
tsconfig.json         # extends generated .svelte-kit/tsconfig.json
src/app.html          # shell
src/lib/api.ts        # same as the React spikes
src/routes/+page.svelte  # entire chat UI in 130 lines
```

## Notes (fill in after `pnpm dev`)

- Cold install: ___s
- Cold dev start: ___s
- HMR roundtrip: ___ms
- `pnpm build`: ___s, ___KB first-load JS
- DX: ___
