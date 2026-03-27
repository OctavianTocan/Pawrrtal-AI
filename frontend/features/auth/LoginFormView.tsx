import type React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface LoginFormViewProps extends Omit<React.ComponentProps<'div'>, 'onSubmit'> {
  /** Unique ID prefix for form field elements. */
  emailId: string;
  /** Unique ID prefix for the password field. */
  passwordId: string;
  /** Current email input value. */
  email: string;
  /** Called on every email keystroke. */
  onEmailChange: (value: string) => void;
  /** Current password input value. */
  password: string;
  /** Called on every password keystroke. */
  onPasswordChange: (value: string) => void;
  /** Error message to display, or empty string for none. */
  errorMessage: string;
  /** Whether a login request is in-flight (disables buttons). */
  isLoading: boolean;
  /** Whether the dev-only "Test User" shortcut is available. */
  canUseTestUser: boolean;
  /** Called when the form is submitted. */
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Called when the "Test User" button is clicked. */
  onTestUserLogin: () => void;
}

/**
 * Pure presentation layer for the login form.
 *
 * Renders the card with email/password fields, error alert, submit button,
 * optional test-user shortcut, and signup link. All state and async logic
 * live in the container (`LoginForm`).
 */
export function LoginFormView({
  className,
  emailId,
  passwordId,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  errorMessage,
  isLoading,
  canUseTestUser,
  onSubmit,
  onTestUserLogin,
  ...props
}: LoginFormViewProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              {/* -- Alert -- */}
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              {/* -- Email -- */}
              <Field>
                <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                <Input
                  id={emailId}
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                />
              </Field>
              {/* -- Password -- */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
                  <a
                    href="/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                />
              </Field>
              {/* -- Actions -- */}
              <Field>
                <Button type="submit" disabled={isLoading}>
                  Login
                </Button>
                {canUseTestUser && (
                  <>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={onTestUserLogin}
                      disabled={isLoading}
                    >
                      Test User
                    </Button>
                    <FieldDescription className="text-center text-xs">
                      Dev-only shortcut for the shared test account.
                    </FieldDescription>
                  </>
                )}
                {/* TODO: Link to login with Google. */}
                <Button variant="outline" type="button" disabled={isLoading}>
                  Login with Google
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
