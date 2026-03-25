import { LoginForm } from "@/components/login-form";

function getTestUserCredentials() {
	const isLocalDev = process.env.NODE_ENV === "development";
	const isNonProductionVercel =
		Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";
	const shouldExposeTestUser = isLocalDev || isNonProductionVercel;

	if (!shouldExposeTestUser) {
		return {
			testUserEmail: undefined,
			testUserPassword: undefined,
		};
	}

	return {
		testUserEmail: process.env.TEST_USER_EMAIL,
		testUserPassword: process.env.TEST_USER_PASSWORD,
	};
}

export default function Page() {
	const { testUserEmail, testUserPassword } = getTestUserCredentials();

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<LoginForm
					testUserEmail={testUserEmail}
					testUserPassword={testUserPassword}
				/>
			</div>
		</div>
	);
}
