/**
 * @file theme-detection-script.ts
 * @brief Blocking inline script string for pre-hydration theme detection
 *
 * The script runs synchronously inside `<head>` BEFORE React hydration to add
 * the `dark` class to `<html>` when the OS reports `prefers-color-scheme: dark`.
 * Doing this inline prevents the flash-of-unstyled-content (FOUC) that would
 * happen if the dark theme were only applied after hydration.
 *
 * Why this is a string constant rather than JSX:
 * - The body must be a single self-invoking function so it executes
 *   immediately and doesn't pollute the global namespace.
 * - Wrapped in try/catch because `matchMedia` can throw on unusual user
 *   agents; theme detection failing should never break the app.
 *
 * IMPORTANT: do NOT embed this string with a bare `<script
 * dangerouslySetInnerHTML={...} />` JSX tag.  React 19 throws a runtime
 * error "Encountered a script tag while rendering React component" on
 * the client side, which cascades and breaks hydration of the rest of
 * the tree.  Use `next/script` with `strategy="beforeInteractive"`
 * instead — see `frontend/app/layout.tsx`.
 */

/**
 * Inline IIFE that mirrors the system color-scheme preference onto
 * `document.documentElement.classList`. Embedded via Next.js's
 * `<Script strategy="beforeInteractive">` in the root layout's `<head>`.
 */
export const THEME_DETECTION_SCRIPT = `(function(){try{var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme:dark)');if(m.matches){d.classList.add('dark')}m.addEventListener('change',function(e){e.matches?d.classList.add('dark'):d.classList.remove('dark')})}catch(e){}})()`;
