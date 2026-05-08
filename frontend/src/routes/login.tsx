/**
 * Login route (`/login`).
 *
 * Pattern per the official auth-and-guards skill:
 *
 *   - `validateSearch` declares the typed `?redirect=` search param so
 *     post-login navigation can read it without manual parsing.
 *   - `beforeLoad` redirects to the saved location if the user is
 *     already authenticated (no point showing them the form).
 *   - The component reads `Route.useSearch()` for the redirect target
 *     and `Route.useNavigate()` for post-login navigation.
 */

import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/LoginForm';
import { OnboardingBackdrop } from '@/features/onboarding/OnboardingBackdrop';

interface LoginSearch {
	redirect: string;
}

/**
 * Whether the dev admin shortcut should be shown.  Vercel's preview
 * env var is gone post-Next.js; we use Vite's MODE flag instead.
 */
function canUseDevAdminLogin(): boolean {
	return import.meta.env.MODE !== 'production';
}

export const Route = createFileRoute('/login')({
	validateSearch: (search: Record<string, unknown>): LoginSearch => ({
		redirect: typeof search.redirect === 'string' ? search.redirect : '/',
	}),
	beforeLoad: ({ context, search }) => {
		if (context.auth.isLoading) return;
		if (context.auth.isAuthenticated) {
			throw redirect({ to: search.redirect });
		}
	},
	component: LoginRoute,
});

function LoginRoute(): React.JSX.Element {
	const showDevAdminLogin = canUseDevAdminLogin();

	return (
		<div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<OnboardingBackdrop />
			<div className="popover-styled onboarding-panel relative z-10 w-full max-w-sm p-8">
				<LoginForm canUseDevAdminLogin={showDevAdminLogin} />
			</div>
		</div>
	);
}
