# Spike 04 — Solid.js + Vite

Same chat surface, in Solid.  JSX feel, signal-based reactivity, no
virtual DOM — closest spiritual sibling to React without React's
runtime cost.

## Run

```bash
pnpm install
pnpm dev   # http://localhost:5176
```

## Why try it

- JSX, so existing React mental model carries over (mostly).
- `createSignal` returns a getter+setter pair — reactivity is
  explicit, no rules-of-hooks, no `useCallback`/`useMemo` dance.
- Reactive primitives are values, not components — `<For>` and
  `<Show>` stay where they belong (in the markup) without rerendering
  the whole subtree on every change.
- Bundle size benchmarks better than React for this kind of small
  surface; whether that matters at our scale is part of what we're
  measuring.

## Files

```
package.json          # 4 deps total (solid-js, vite, vite-plugin-solid, ts)
vite.config.ts
tsconfig.json         # jsxImportSource: 'solid-js'
index.html
src/index.tsx         # render(() => <App />, root)
src/App.tsx           # signals + <For>/<Show>
src/api.ts            # same shape as the other spikes
src/styles.css
```

## Notes (fill in after `pnpm dev`)

- Cold install: ___s
- Cold dev start: ___s
- HMR roundtrip: ___ms
- `pnpm build`: ___s, ___KB first-load JS
- DX: ___
