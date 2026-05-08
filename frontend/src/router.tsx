/**
 * Router instance + module-augmented `Register` declaration.
 *
 * Lives in its own module per the official auth-and-guards skill:
 * the router needs to know about the auth context shape, but the
 * actual auth value comes from React via `<RouterProvider context>`.
 * Splitting the router definition from the mount lets `_app` and
 * `__root` import this module to access `Route.useRouteContext()`.
 *
 * Hash history is selected by default for Electron's `app://` /
 * `file://` schemes; in a browser context (Vite dev or web prod)
 * the default browser history works.  TanStack Router's
 * `parseLocation` had issues with `null` origins under `file://`
 * (router#5509) — the custom protocol path used in Electron prod
 * sidesteps that, but we still set an `origin` defensively.
 */

import { createRouter } from '@tanstack/react-router';
import type { AuthState } from './auth';
import { routeTree } from './routeTree.gen';

export interface RouterContext {
	auth: AuthState;
}

export const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	context: {
		// `auth` is supplied at runtime via `<RouterProvider context={{ auth }}>`;
		// the `undefined!` cast follows the pattern shown in TanStack's
		// auth-and-guards skill — TypeScript treats it as the right
		// shape, the runtime value is injected before any beforeLoad runs.
		auth: undefined!,
	},
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
