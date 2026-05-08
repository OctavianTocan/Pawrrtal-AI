/**
 * Root route — applies to every page.
 *
 * Uses `createRootRouteWithContext<RouterContext>` per TanStack's
 * official auth-and-guards skill: child routes' `beforeLoad`
 * receives the typed `context.auth` shape this declares, and the
 * value is supplied at mount time via `<RouterProvider context>`.
 *
 * The root component is intentionally minimal — the global
 * `<AppLayout>` chrome lives on the protected `_app` segment, and
 * login / signup intentionally render bare.
 */

import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { RouterContext } from '../router';

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
});
