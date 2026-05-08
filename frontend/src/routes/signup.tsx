/**
 * Sign-up route (`/signup`): centered registration form.
 */

import { createFileRoute } from '@tanstack/react-router';
import { SignupForm } from '@/components/signup-form';

export const Route = createFileRoute('/signup')({
	component: SignupRoute,
});

function SignupRoute(): React.JSX.Element {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<SignupForm />
			</div>
		</div>
	);
}
