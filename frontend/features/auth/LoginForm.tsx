'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useId, useState } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api';
import { LoginFormView } from './LoginFormView';

interface LoginFormProps extends React.ComponentProps<'div'> {
  canUseDevAdminLogin?: boolean;
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
 * @param canUseDevAdminLogin - Whether to show the dev-only admin shortcut button.
 */
export function LoginForm({
  className,
  canUseDevAdminLogin = false,
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

  /** Calls a backend-only shortcut that logs in with the seeded admin account. */
  const submitDevAdminLogin = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.devLogin}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        let nextErrorMessage = 'Unable to use the dev admin login shortcut.';

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

      setErrorMessage('');
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
      canUseDevAdminLogin={canUseDevAdminLogin}
      onSubmit={handleSubmit}
      onDevAdminLogin={submitDevAdminLogin}
      {...divProps}
    />
  );
}
