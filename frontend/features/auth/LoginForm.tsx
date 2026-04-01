'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useId, useState } from 'react';
import { LoginFormView } from './LoginFormView';
import { useLoginMutation, useDevAdminLoginMutation } from './hooks/use-login-mutations';

interface LoginFormProps extends React.ComponentProps<'div'> {
  canUseDevAdminLogin?: boolean;
}

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
  const [localErrorMessage, setLocalErrorMessage] = useState('');

  const router = useRouter();

  const loginMutation = useLoginMutation();
  const devLoginMutation = useDevAdminLoginMutation();

  const isLoading = loginMutation.isPending || devLoginMutation.isPending;

  /**
   * Maps browser-specific fetch failures to a clearer backend-unreachable message,
   * while preserving any other surfaced error text.
   */
  const setFriendlyNetworkError = (error: unknown): void => {
    if (!(error instanceof Error)) {
      return;
    }

    const normalizedMessage = error.message.toLowerCase();
    if (error instanceof TypeError && normalizedMessage.includes('fetch')) {
      setLocalErrorMessage('Unable to connect to the backend. Is the server running?');
      return;
    }

    if (error.message) {
      setLocalErrorMessage(error.message);
    }
  };

  // Prefer the local (network) error if the service failed to be reached entirely,
  // otherwise show the specific API error from React Query.
  const currentError =
    localErrorMessage || loginMutation.error?.message || devLoginMutation.error?.message || '';

  /** Form submit handler — prevents default page refresh. */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLocalErrorMessage('');
    loginMutation.reset();
    devLoginMutation.reset();

    try {
      await loginMutation.mutateAsync({ email, password });
      router.push('/');
    } catch (error) {
      setFriendlyNetworkError(error);
    }
  };

  /** Calls a backend-only shortcut that logs in with the seeded admin account. */
  const handleDevAdminLogin = async (): Promise<void> => {
    setLocalErrorMessage('');
    loginMutation.reset();
    devLoginMutation.reset();

    try {
      await devLoginMutation.mutateAsync();
      router.push('/');
    } catch (error) {
      setFriendlyNetworkError(error);
    }
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
      errorMessage={currentError}
      isLoading={isLoading}
      canUseDevAdminLogin={canUseDevAdminLogin}
      onSubmit={handleSubmit}
      onDevAdminLogin={handleDevAdminLogin}
      {...divProps}
    />
  );
}
