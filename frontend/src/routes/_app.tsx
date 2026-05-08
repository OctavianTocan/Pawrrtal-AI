/**
 * Protected app segment layout.
 *
 * Replaces both the `frontend/app/(app)/layout.tsx` chrome wrapper AND
 * the `frontend/proxy.ts` middleware auth gate.  TanStack Router's
 * `beforeLoad` redirects unauthenticated requests to `/login` before
 * any child route renders, mirroring what the Next.js middleware did
 * via cookie inspection.
 *
 * Cookie semantics: the `session_token` cookie is httpOnly, so the
 * client can't read it directly.  We use a probe call against
 * `/api/v1/conversations` (any cheap authed endpoint works) and route
 * to `/login` on 401.  This is a one-extra-roundtrip cost on first
 * load that buys us the same gate the middleware enforced server-side.
 *
 * The probe is a single shared promise — multiple route navigations
 * within the same session don't multiply requests.
 */

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/app-layout';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';

let authProbe: Promise<boolean> | null = null;

async function isAuthenticated(): Promise<boolean> {
	if (authProbe !== null) return authProbe;
	authProbe = (async () => {
		try {
			const res = await fetch(API_BASE_URL + API_ENDPOINTS.conversations.list, {
				method: 'GET',
				credentials: 'include',
			});
			return res.status !== 401;
		} catch {
			return false;
		}
	})();
	return authProbe;
}

export const Route = createFileRoute('/_app')({
	beforeLoad: async ({ location }) => {
		const ok = await isAuthenticated();
		if (!ok) {
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
