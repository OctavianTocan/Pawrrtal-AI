import { LoginForm } from '@/features/auth/LoginForm';

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

/** Login page — renders the login form with an optional dev-only admin shortcut. */
export default function Page(): React.JSX.Element {
	const showDevAdminLogin = canUseDevAdminLogin();

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm canUseDevAdminLogin={showDevAdminLogin} />
			</div>
		</div>
	);
}
