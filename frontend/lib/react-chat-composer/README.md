# @octavian-tocan/react-chat-composer

Themable React composer for AI chat UIs — text input, file attachments,
model + reasoning picker, voice recording, and empty-state prompt suggestions.
Built on Tailwind v4.

> **Status: feature-complete (v0.1.0, unreleased)** — full composer surface
> implemented, `tsup` build green (ESM + CJS + DTS for `index` / `primitives`
> / `hooks` / `types` + bundled `styles/theme.css` + `styles/animations.css`),
> running in pawrrtal via the git submodule under
> `frontend/lib/react-chat-composer/`. First npm publish pending — until then
> consume from the submodule path or the package's `main` branch directly.

## Installation

```bash
pnpm add @octavian-tocan/react-chat-composer
# peer deps
pnpm add react react-dom clsx tailwind-merge lucide-react \
  @octavian-tocan/react-dropdown @radix-ui/react-tooltip
```

Requires **Tailwind CSS v4**.

## Quick Start

```tsx
import { ChatComposer, CHAT_MODELS_2026 } from '@octavian-tocan/react-chat-composer';

export function MyChat() {
  const [text, setText] = useState('');
  return (
    <ChatComposer
      defaultValue=""
      onChange={setText}
      onSubmit={({ text, attachments }) => sendMessage(text, attachments)}
      models={CHAT_MODELS_2026}
      selectedModelId={modelId}
      onSelectModel={setModelId}
      onTranscribeAudio={async (blob, mime) => {
        // Plug in your STT provider (Whisper, Deepgram, xAI, etc.)
        return await transcribe(blob, mime);
      }}
    />
  );
}
```

## Setup

In your global CSS (typically `app/globals.css`):

```css
@import "tailwindcss";

/* 1. Tell Tailwind to scan the package's compiled output for utility classes. */
@source "../node_modules/@octavian-tocan/react-chat-composer/dist";

/* 2. Bring in the chat-* token defaults (light + dark). */
@import "@octavian-tocan/react-chat-composer/styles/theme.css";

/* 3. Bring in the non-Tailwind keyframes + animation classes. */
@import "@octavian-tocan/react-chat-composer/styles/animations.css";

/* 4. (Optional) Override any chat-* token to theme the composer. */
:root {
  --color-chat-accent: #ff6b35;
}
```

## Public API

- `<ChatComposer />` — the flagship component
- `<ChatPromptSuggestions />` — empty-state suggested-prompt list
- `defineChatModel()` + `CHAT_MODELS_2026` — model-list helpers
- `/primitives` — `<ComposerActionSelector />`, `<ProviderLogo />`,
  `<VoiceMeter />`
- `/hooks` — `useVoiceRecording()`
- `/types` — all public types

A comprehensive `docs/API.md` reference is forthcoming. Until then, types
are the source of truth — every exported component, hook, and helper has
TSDoc.

## Status / roadmap

What ships today:

- [x] Package scaffold (tsup, tsconfig, vitest, eslint, prettier,
      semantic-release)
- [x] Submodule integration with `OctavianTocan/ai-nexus`
- [x] Vendored `prompt-input-*` from Vercel AI Elements (form, textarea,
      attachments, context, footer + submit)
- [x] Minimal `Button` + Radix `Tooltip` wrapper (shadcn-derived)
- [x] `cn`, `usePersistedState`, `useTooltipDropdown` utilities
- [x] `useVoiceRecording` — recording lifecycle + `onTranscribeAudio` swap
      point (consumer provides STT)
- [x] `ChatComposer` + `ChatComposerView` (View/Container split, controlled
      or uncontrolled text API)
- [x] `ChatComposerControls` — AttachButton, VoiceMeter, WaveformTimeline,
      ComposerTooltip, transcript + voice-recognition helpers
- [x] `ModelSelectorPopover` + View + bundled `<ProviderLogo>` with inline
      SVGs for 8 known providers (anthropic, openai, google, mistral, xai,
      meta, deepseek, qwen) + per-model override via `ChatModelOption.logo`
- [x] `ChatPromptSuggestions` — empty-state suggested-prompt list
- [x] `ComposerActionSelector` — generic safety-mode-style dropdown
      primitive, exposed for consumers to build their own permission
      selectors
- [x] `CHAT_MODELS_2026` sample preset + `defineChatModel` helper
- [x] `styles/theme.css` (Tailwind v4 `@theme` block, `chat-*` tokens,
      light + dark defaults) + `styles/animations.css`
- [x] Self-provided `TooltipProvider` so the composer drops in without
      consumer setup
- [x] Built `dist/` verified: ESM + CJS + DTS for every subpath export

Deferred / next:

- [ ] Storybook + lost-pixel visual regression
- [ ] First npm publish (semantic-release wired; cut the v0.1.0 tag)
- [ ] `docs/API.md` written reference
- [ ] Vitest unit coverage targeting 70%+ statements

## License

MIT — see [LICENSE](./LICENSE).
Vendored code from Vercel AI Elements and shadcn/ui — see [NOTICE.md](./NOTICE.md).
