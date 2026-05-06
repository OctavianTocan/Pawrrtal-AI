import { LoginForm } from '@/features/auth/LoginForm';
import { OnboardingBackdrop } from '@/features/onboarding/OnboardingBackdrop';

/**
 * Returns whether the dev admin shortcut should be shown.
 *
 * The actual credentials remain on the backend. We only expose a boolean
 * here, so previews and dev deployments can show the button safely.
 */
function canUseDevAdminLogin(): boolean {
	// VERCEL_ENV is undefined in local dev, 'preview' on preview deploys,
	// and 'production' only in production — so this correctly covers all non-prod environments.
	return process.env.VERCEL_ENV !== 'production';
}

/**
 * Login page — renders the login form on the same scenic dotted backdrop
 * used by the onboarding modal so the auth surface and post-login surface
 * read as one design language. The form sits centered with the standard
 * `popover-styled onboarding-panel` chrome around it.
 */
export default function Page(): React.JSX.Element {
	const showDevAdminLogin = canUseDevAdminLogin();

	return (
		<div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-6 md:p-10">
			<OnboardingBackdrop />
			<div className="relative z-10 w-full max-w-md">
				<LoginForm canUseDevAdminLogin={showDevAdminLogin} />
			</div>
		</div>
	);
}
