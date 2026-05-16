/**
 * Sign-up route (`/signup`): centered registration form.
 */

import { SignupForm } from '@/features/auth/signup-form';

export default function Page() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<SignupForm />
			</div>
		</div>
	);
}
