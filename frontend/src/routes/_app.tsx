/**
 * Protected app segment layout.
 *
 * Replaces both the `frontend/app/(app)/layout.tsx` chrome wrapper
 * AND the `frontend/proxy.ts` middleware auth gate.  Pattern per the
 * official auth-and-guards skill:
 *
 *   - `beforeLoad` reads `context.auth.isAuthenticated` (supplied by
 *     `<RouterProvider context={{ auth }}>` in `main.tsx`).
 *   - On an unauthenticated request, throw `redirect()` with the
 *     attempted location stashed in `search.redirect` so login can
 *     send the user back after success.
 *   - The component returns the standard `<AppLayout>` chrome
 *     wrapping `<Outlet />`.
 */

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/_app')({
	beforeLoad: ({ context, location }) => {
		// Wait for the initial auth probe before deciding.  Without
		// this, the redirect fires on first paint while
		// `isAuthenticated` is still its default `false`, even for
		// already-logged-in users.
		if (context.auth.isLoading) return;
		if (!context.auth.isAuthenticated) {
			throw redirect({
				to: '/login',
				search: { redirect: location.href },
			});
		}
	},
	component: () => (
		<AppLayout>
			<Outlet />
		</AppLayout>
	),
});
