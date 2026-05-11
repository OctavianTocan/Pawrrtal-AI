# Agent Guidelines — @octavian-tocan/react-chat-composer

This file gives coding agents working in this repository the essentials.

## Project

A themable React composer for AI chat UIs. Tailwind v4-based. Used as a git
submodule by `OctavianTocan/ai-nexus` under `frontend/lib/react-chat-composer/`.

The package is being lifted out of pawrrtal in stages — see the host repo's
`docs/plans/extract-react-chat-composer.md` for the full plan and ADR.

## Commands

- `pnpm run build` — build the library with tsup (ESM + CJS + DTS)
- `pnpm run dev` — watch mode
- `pnpm run typecheck` — `tsc --noEmit`
- `pnpm run test` — vitest
- `pnpm run lint` — eslint
- `pnpm run format` — prettier

## Style

- TypeScript strict; explicit return types on every exported function
- React 18/19 compatible (peer dep range)
- `'use client'` at the top of every component file (Next.js compat)
- 2-space indentation, trailing commas, max ~100 chars/line
- Components: PascalCase. Hooks: camelCase. Constants: UPPER_SNAKE_CASE.
- File names: `{Component}.tsx`, `{Component}.test.tsx`, `{Component}.stories.tsx`

## Architecture rules

- **View/Container split.** Every non-trivial component has a
  `*View.tsx` (pure presentation, no hooks beyond `useId` / `useMemo` /
  `useCallback` / `useMediaQuery`) and a paired `*.tsx` container that owns
  hooks and state.
- **Token namespace.** All visual decisions reference `--color-chat-*`,
  `--radius-chat-*`, `--shadow-chat-*`, `--animate-chat-*` CSS variables. Light
  and dark defaults live in `src/styles/theme.css`; consumers may override any
  variable to retheme.
- **Tailwind only via the consumer.** This package ships raw Tailwind classes
  + a `@source`-able `dist` directory and the theme.css `@theme` block. It
  does NOT bundle a Tailwind preset config — the consumer's Tailwind v4
  install does the compiling.

## File organisation

```
src/
├── composer/           # ChatComposer container + View + controls
├── model-selector/     # ModelSelectorPopover container + View + data
├── primitives/         # ComposerActionSelector, ProviderLogo, VoiceMeter
├── prompt-input/       # Vendored AI Elements pieces (NOTICE.md)
├── prompt-suggestions/ # ChatPromptSuggestions
├── hooks/              # useVoiceRecording, usePersistedState, useTooltipDropdown
├── ui/                 # Button, Tooltip (minimal shadcn-derived)
├── utils/              # cn (clsx + tailwind-merge)
├── styles/             # theme.css + animations.css
├── types/              # public type re-exports
└── index.ts            # main entry barrel
```

## Tests

- Vitest + `@testing-library/react` + jsdom
- Test files in `src/__tests__/`
- Mock `window.matchMedia`, `ResizeObserver`, `MediaRecorder` in `vitest.setup.ts`

## Documentation

- TSDoc on every exported function, class, interface, type alias, constant
- Inline `/** */` comments above each interface property (not `@property`
  block tags — IDE hover doesn't surface those)
- Inline comments explain WHY, not WHAT

## Before committing

```bash
pnpm run typecheck
pnpm run test
pnpm run lint
```

Use conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `chore:`,
`docs:`, `test:`). Each commit is one logical change.

## Versioning

`semantic-release` reads conventional commits and publishes to npm
automatically on push to `main`. The package is feature-complete at
`0.1.0` (unreleased) — the first publish is deferred to a deliberate
release after Storybook + lost-pixel coverage land. Until then consumers
clone `OctavianTocan/react-chat-composer` directly or pin via the
git submodule in `OctavianTocan/ai-nexus`.
