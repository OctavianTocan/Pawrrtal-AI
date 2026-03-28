'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useId, useState } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';
import { LoginFormView } from './LoginFormView';

interface LoginFormProps extends React.ComponentProps<'div'> {
  testUserEmail?: string;
  testUserPassword?: string;
}

type LoginCredentials = {
  email: string;
  password: string;
};

/**
 * Container for the login form.
 *
 * Owns form state, validation, API calls, and navigation on success.
 * Delegates all rendering to `LoginFormView`.
 *
 * @param testUserEmail    - Pre-filled email for the dev-only "Test User" button.
 * @param testUserPassword - Pre-filled password for the dev-only "Test User" button.
 */
export function LoginForm({
  className,
  testUserEmail,
  testUserPassword,
  ...props
}: LoginFormProps): React.JSX.Element {
  // Destructure onSubmit from rest to avoid conflict with our custom onSubmit prop.
  const { onSubmit: _nativeOnSubmit, ...divProps } = props;
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const canUseTestUser = Boolean(testUserEmail && testUserPassword);

  /** Sends credentials to the login API and redirects on success. */
  const submitLogin = async ({ email, password }: LoginCredentials): Promise<void> => {
    setIsLoading(true);

    try {
      // TODO: This inline fetch needs to be moved to a custom hook.
      // TODO: Especially now that we also use this in the signup form.
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username: email, password }),
        credentials: 'include',
      });

      // Handle errors.
      // TODO: This same code is used on both the login and signup forms, which means it should be moved to a shared function.
      if (!response.ok) {
        let nextErrorMessage = 'Unable to log in with those credentials.';

        try {
          const error = await response.json();
          if (typeof error?.detail === 'string') {
            nextErrorMessage = error.detail;
          }
        } catch {
          // Ignore JSON parse failures and keep the generic message.
        }

        setErrorMessage(nextErrorMessage);
        return;
      }

      // Reset the error message.
      // We do it here, so the Alert component doesn't jump unnecessarily every time we press the submit button.
      setErrorMessage('');

      // Redirect to the homepage.
      router.push('/');
    } catch {
      setErrorMessage('Unable to reach the login service.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Form submit handler — prevents default page refresh. */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await submitLogin({ email, password });
  };

  /** Dev-only shortcut to log in as the test user. */
  const handleTestUserLogin = async (): Promise<void> => {
    if (!testUserEmail || !testUserPassword) {
      return;
    }

    setEmail(testUserEmail);
    await submitLogin({
      email: testUserEmail,
      password: testUserPassword,
    });
  };

  return (
    <LoginFormView
      className={className}
      emailId={emailId}
      passwordId={passwordId}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      errorMessage={errorMessage}
      isLoading={isLoading}
      canUseTestUser={canUseTestUser}
      onSubmit={handleSubmit}
      onTestUserLogin={handleTestUserLogin}
      {...divProps}
    />
  );
}
