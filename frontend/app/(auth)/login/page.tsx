import { LoginForm } from '@/features/auth/LoginForm';

/**
 * Returns test-user credentials when running in local development.
 *
 * On deployed previews the env vars may exist but are NOT returned,
 * because the server component would serialize them into the client
 * HTML/JS bundle — exposing the password publicly.
 */
function getTestUserCredentials(): {
  testUserEmail: string | undefined;
  testUserPassword: string | undefined;
} {
  // Only expose test credentials in local development — never on deployed
  // previews, where the password would be serialized into client HTML/JS.
  const shouldExposeTestUser = process.env.NODE_ENV === 'development';

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

/** Login page — renders the login form with optional dev-only test user shortcut. */
export default function Page(): React.JSX.Element {
  const { testUserEmail, testUserPassword } = getTestUserCredentials();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm testUserEmail={testUserEmail} testUserPassword={testUserPassword} />
      </div>
    </div>
  );
}
