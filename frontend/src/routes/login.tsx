/**
 * Login page (`/login`).
 *
 * Lives outside the `_app` segment so the chat sidebar / app chrome
 * doesn't render around the login form, and so the auth gate doesn't
 * loop the unauthenticated user back here.
 */

import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/LoginForm';
import { OnboardingBackdrop } from '@/features/onboarding/OnboardingBackdrop';

/**
 * Whether the dev admin shortcut should be shown.  Vercel's preview
 * env var is gone; we use Vite's MODE / dev flag instead.
 */
function canUseDevAdminLogin(): boolean {
	return import.meta.env.MODE !== 'production';
}

export const Route = createFileRoute('/login')({
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
