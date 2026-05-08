/**
 * Root route — applies to every page.
 *
 * Holds nothing but the `<Outlet />` since the global app shell
 * (`<AppLayout>`) lives only on the protected `_app` segment, and login /
 * signup intentionally render bare.  Devtools mount here so they're
 * available across both segments.
 */

import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
	component: () => <Outlet />,
});
