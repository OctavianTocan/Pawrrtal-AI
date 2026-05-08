# Spike 02 — React + Vite + TanStack Router

Same chat surface as spike 01, but with TanStack Router driving
file-based routing.  Two routes: `/` (home) and `/chat`.

## Why TanStack Router

- File-based routes (`src/routes/*.tsx`) — same DX as Next App Router
  for navigation without committing to RSC / Edge runtime.
- Generates a fully type-safe `routeTree.gen.ts` from the route files,
  so `<Link to="/chat">` is statically checked.
- Supports route-level loaders + search-param parsing if we ever need
  them, without dragging in a server runtime.

## Run

```bash
pnpm install
pnpm dev   # http://localhost:5174
```

The TanStack Router Vite plugin watches `src/routes/` and regenerates
`src/routeTree.gen.ts` on save (gitignored).

## Files added vs spike 01

```
+ src/routes/__root.tsx   # shared layout + nav
+ src/routes/index.tsx    # home
+ src/routes/chat.tsx     # chat (was App.tsx in spike 01)
+ src/routeTree.gen.ts    # generated, gitignored
~ vite.config.ts          # +TanStackRouterVite plugin
~ src/main.tsx            # RouterProvider instead of <App/>
~ package.json            # +2 deps (@tanstack/react-router, router-plugin)
```

## Notes (fill in after `pnpm dev`)

- Cold install: ___s
- Cold dev start: ___s
- HMR roundtrip: ___ms
- `pnpm build`: ___s, ___KB first-load JS
- DX: ___
