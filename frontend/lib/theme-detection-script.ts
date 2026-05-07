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
 * - The Next.js 16 / React 19 console warning "Encountered a script tag while
 *   rendering React component" fires whenever `<script>` is rendered as JSX.
 *   The warning is informational — the script DOES execute in the SSR'd HTML —
 *   but moving the body to a server-only constant keeps the JSX surface clean
 *   and lets us suppress the warning at exactly one site.
 * - The body must be a single self-invoking function so it executes immediately
 *   and doesn't pollute the global namespace.
 * - Wrapped in try/catch because `matchMedia` can throw on unusual user agents;
 *   theme detection failing should never break the app.
 */

/**
 * Inline IIFE that mirrors the system color-scheme preference onto
 * `document.documentElement.classList`. Safe to embed via
 * `dangerouslySetInnerHTML` in the root layout's `<head>`.
 */
export const THEME_DETECTION_SCRIPT = `(function(){try{var d=document.documentElement;var m=window.matchMedia('(prefers-color-scheme:dark)');if(m.matches){d.classList.add('dark')}m.addEventListener('change',function(e){e.matches?d.classList.add('dark'):d.classList.remove('dark')})}catch(e){}})()`;
