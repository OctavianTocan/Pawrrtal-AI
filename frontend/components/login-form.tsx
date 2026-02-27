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

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	// Error message.
	const [errorMessage, setErrorMessage] = useState("");
	// To disable buttons while submitting.
	const [isLoading, setIsLoading] = useState(false);
	// Get the router.
	const router = useRouter();

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		// Stops the page from refreshing.
		event.preventDefault();

		// Disable the button while submitting.
		setIsLoading(true);

		// TODO: This inline fetch needs to be moved to a custom hook.
		// TODO: Especially now that we also use this in the signup form.
		const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({ username: email, password: password }),
			credentials: "include",
		});

		// Handle errors.
		// TODO: This same code is used on both the login and signup forms, which means it should be moved to a shared function.
		if (!response.ok) {
			const error = await response.json();
			setErrorMessage(error.detail);
			// Enable the button again.
			setIsLoading(false);
			return;
		}

		// Reset the error message.
		// We do it here, so the Alert component doesn't jump unnecessarily every time we press the submit button.
		setErrorMessage("");

		// Redirect to the homepage.
		router.push("/");
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
