/**
 * Shared Playwright fixtures.
 *
 * `authenticatedPage` runs the dev-admin login via the backend (no UI
 * clicks) and forwards the resulting session cookie into the browser
 * context, so every spec starts already signed in. Per the project's
 * api-setup-not-ui rule.
 */

import { type BrowserContext, test as base } from '@playwright/test';

const BACKEND_URL = process.env.E2E_API_URL ?? 'http://localhost:8000';

/**
 * Authenticate the supplied browser context with the dev-admin user.
 *
 * Hits the backend `/auth/dev-login` endpoint directly — the response
 * body is the session payload, and the Set-Cookie header is what the
 * regular browser flow would normally land. We replay that cookie into
 * the context's cookie jar so the next page navigation is signed in.
 */
async function devLogin(context: BrowserContext): Promise<void> {
	const response = await context.request.post(`${BACKEND_URL}/auth/dev-login`);
	if (!response.ok()) {
		throw new Error(
			`Dev login failed (${response.status()}). Make sure ADMIN_EMAIL + ADMIN_PASSWORD are set in backend/.env and the backend is running.`
		);
	}
	// dev-login returns the session cookie via Set-Cookie. Playwright's
	// request context automatically captures it into the context's cookie
	// jar, so subsequent page.goto() calls share the auth session.
}

export const test = base.extend<{ authenticatedPage: void }>({
	authenticatedPage: [
		async ({ context }, use) => {
			await devLogin(context);
			await use();
		},
		{ auto: false },
	],
});

export const expect = test.expect;
