"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, API_ENDPOINTS } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
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

		const formData = new FormData(event.target as HTMLFormElement);
		const email = formData.get("email")?.toString() ?? "";
		const password = formData.get("password")?.toString() ?? "";
		const confirmPassword = formData.get("confirm-password")?.toString() ?? "";
		const inviteCode = formData.get("invite-code")?.toString() ?? "";
		if (password !== confirmPassword) {
			setErrorMessage("Passwords do not match");
			// Enable the button again.
			setIsLoading(false);
			return;
		}

		// TODO: This inline fetch needs to be moved to a custom hook.
		const response = await fetch(
			`${API_BASE_URL}${API_ENDPOINTS.auth.register}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: email,
					password: password,
					invite_code: inviteCode,
				}),
			},
		);

		// TODO: Check detail for error. ({"detail":"REGISTER_USER_ALREADY_EXISTS"}
		// TODO: Check response for success: ({
		//     "id": "73946aca-98f2-45e8-8690-4da5b62cffbd",
		//     "email": "tocanoctavian@gmail.com",
		//     "is_active": true,
		//     "is_superuser": false,
		//     "is_verified": false
		// }))
		// TODO: If success, redirect back to where the user came from, but with a success message.
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

		// We need to log the user in after we've created the account.
		// Otherwise, it'll feel odd to still need to log in after signing up.
		await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.login}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				username: email,
				password: password,
			}),
			credentials: "include",
		});

		// Redirect to the homepage.
		router.push("/");
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="mb-2 text-center">
				<h1 className="text-xl font-medium text-foreground">
					Create an account
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Enter your information below to get started
				</p>
			</div>
			<Card className="shadow-minimal" {...props}>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							{errorMessage && (
								<Alert variant="destructive">
									<AlertTitle>Error</AlertTitle>
									<AlertDescription>{errorMessage}</AlertDescription>
								</Alert>
							)}
							<Field>
								<FieldLabel htmlFor="name">Full Name</FieldLabel>
								<Input
									id="name"
									type="text"
									placeholder="John Doe"
									required
									name="name"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="m@example.com"
									required
									name="email"
								/>
								<FieldDescription>
									We&apos;ll use this to contact you. We will not share your
									email with anyone else.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Input id="password" type="password" required name="password" />
								<FieldDescription>
									Must be at least 8 characters long.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="confirm-password">
									Confirm Password
								</FieldLabel>
								<Input
									id="confirm-password"
									type="password"
									required
									name="confirm-password"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="invite-code">Invite Code</FieldLabel>
								<Input
									id="invite-code"
									type="password"
									required
									name="invite-code"
									placeholder="Enter your invite code"
								/>
								<FieldDescription>
									An invite code is required to create an account.
								</FieldDescription>
							</Field>
							<Field>
								<Button type="submit" disabled={isLoading} className="w-full">
									Create Account
								</Button>
								<FieldDescription className="text-center">
									Already have an account?{" "}
									<a
										href="/login"
										className="text-foreground underline underline-offset-4 hover:text-accent"
									>
										Sign in
									</a>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
