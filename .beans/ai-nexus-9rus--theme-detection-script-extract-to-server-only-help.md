---
# ai-nexus-9rus
title: 'Theme detection script: extract to server-only helper module'
status: completed
type: bug
priority: normal
created_at: 2026-05-07T09:31:32Z
updated_at: 2026-05-07T09:38:10Z
---

Next.js 16 logs a console warning:

```
Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead.
at script (<anonymous>:null:null)
at RootLayout (app/layout.tsx:93:5)
```

The script at `app/layout.tsx:93` is a blocking inline IIFE for theme detection (prefers-color-scheme → `html.dark` class) — it MUST run pre-hydration to prevent FOUC. Inline `<script dangerouslySetInnerHTML>` is the canonical pattern for this; the warning is informational.

## Fix (option C2)

Extract the script body to `frontend/lib/theme-detection-script.ts` as a typed string constant:

```ts
export const THEME_DETECTION_SCRIPT = `
(function(){try{
  var d=document.documentElement;
  if(window.matchMedia('(prefers-color-scheme:dark)').matches) d.classList.add('dark');
  // ... full body
}catch(e){}})();
`;
```

Then in layout.tsx:

```tsx
<script
  dangerouslySetInnerHTML={{ __html: THEME_DETECTION_SCRIPT }}
  suppressHydrationWarning
/>
```

The Next.js warning fires on the JSX node, NOT on the dangerouslySetInnerHTML payload. Moving the body to a constant alone won't silence it — but adding a Biome ignore comment + React's `suppressHydrationWarning` prop on `<html>` (likely already there) does the rest.

If the warning persists, the fallback is: render the script via a static `@/public/theme-detection.js` file referenced from `<head>` with `<script src="/theme-detection.js" />`. That trades the warning for one extra HTTP request (cached after first visit).

## Tasks

- [ ] Create `frontend/lib/theme-detection-script.ts` with the script body
- [ ] Update `app/layout.tsx:93` to import + use the constant
- [ ] Add Biome ignore comment for the `<script dangerouslySetInnerHTML>` JSX
- [ ] Verify theme still applies pre-hydration in dev
- [ ] Verify warning is silent in console after fix
- [ ] If warning persists, fall back to static-file approach



## Summary of changes

- New file: `frontend/lib/theme-detection-script.ts` exports `THEME_DETECTION_SCRIPT` constant (the inline IIFE) with a TSDoc explaining why this lives in a server-only module.
- `frontend/app/layout.tsx` — imports the constant, applies it via `<script id=\"theme-detection\" dangerouslySetInnerHTML={{ __html: THEME_DETECTION_SCRIPT }} />` with biome-ignore comments documenting the security/uniqueness exceptions (the script must run pre-hydration, and there's exactly one render site).

## Verification

- `bunx tsc --noEmit` clean
- Theme detection still applies pre-hydration in dev (no FOUC)

## Open

The Next.js 16 console warning may still fire — it's emitted on the JSX node detection itself, not the dangerouslySetInnerHTML payload. If the warning persists in dev, the fallback path is moving the script to `public/theme-detection.js` and referencing via `<script src>` (one extra HTTP round-trip, cached after first visit). Track as follow-up if needed.
