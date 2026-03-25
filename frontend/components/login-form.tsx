"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface LoginFormProps extends React.ComponentProps<"div"> {
	testUserEmail?: string;
	testUserPassword?: string;
}

type LoginCredentials = {
	email: string;
	password: string;
};

export function LoginForm({
	className,
	testUserEmail,
	testUserPassword,
	...props
}: LoginFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	// Error message.
	const [errorMessage, setErrorMessage] = useState("");
	// To disable buttons while submitting.
	const [isLoading, setIsLoading] = useState(false);
	// Get the router.
	const router = useRouter();
	const canUseTestUser = Boolean(testUserEmail && testUserPassword);

	const submitLogin = async ({ email, password }: LoginCredentials) => {
		setIsLoading(true);

		try {
			// TODO: This inline fetch needs to be moved to a custom hook.
			// TODO: Especially now that we also use this in the signup form.
			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({ username: email, password }),
				credentials: "include",
			});

			// Handle errors.
			// TODO: This same code is used on both the login and signup forms, which means it should be moved to a shared function.
			if (!response.ok) {
				let nextErrorMessage = "Unable to log in with those credentials.";

				try {
					const error = await response.json();
					if (typeof error?.detail === "string") {
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
			setErrorMessage("");

			// Redirect to the homepage.
			router.push("/");
		} catch {
			setErrorMessage("Unable to reach the login service.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		// Stops the page from refreshing.
		event.preventDefault();
		await submitLogin({ email, password });
	};

	const handleTestUserLogin = async () => {
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
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>
						Enter your email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							{/* -- Alert -- */}
							{errorMessage && (
								<Alert variant="destructive">
									<AlertTitle>Error</AlertTitle>
									<AlertDescription>{errorMessage}</AlertDescription>
								</Alert>
							)}
							{/* -- Field -- */}
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</Field>
							<Field>
								<div className="flex items-center">
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<a
										href="/forgot-password"
										className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
									>
										Forgot your password?
									</a>
								</div>
								<Input
									id="password"
									type="password"
									autoComplete="current-password"
									required
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
									}}
								/>
							</Field>
							<Field>
								{/* Login */}
								<Button type="submit" disabled={isLoading}>
									Login
								</Button>
								{canUseTestUser && (
									<>
										<Button
											variant="outline"
											type="button"
											onClick={handleTestUserLogin}
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
								{/* Signup */}
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
