# Spike 01 — React + Vite

The "just remove Next.js" baseline.  React 19, Vite, no router, no SSR,
no app shell, no providers tree.  Single page that does the four steps
in `../README.md`.

## Run

```bash
pnpm install
pnpm dev
# open http://localhost:5173
```

Backend assumed at `http://localhost:8000`.  Override with
`VITE_BACKEND_URL=https://api.pawrrtal.app pnpm dev`.

## Files

```
package.json     # 5 deps total (react, react-dom, vite, plugin-react, typescript)
vite.config.ts   # 8 lines
tsconfig.json
index.html
src/main.tsx     # <App /> mount
src/App.tsx      # one component does it all
src/api.ts       # fetch + SSE parsing, framework-agnostic
src/styles.css
```

## Notes (fill in after `pnpm dev`)

- Cold install: ___s
- Cold dev start: ___s
- HMR roundtrip: ___ms
- `pnpm build`: ___s, ___KB first-load JS
- DX: ___
