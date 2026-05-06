/**
 * Personalization wizard smoke: the home-page modal opens on every fresh
 * load and the form fields accept input.
 */

import { expect, test } from './fixtures';

test.describe('home-page personalization', () => {
	test.beforeEach(async ({ context }) => {
		const response = await context.request.post(
			`${process.env.E2E_API_URL ?? 'http://localhost:8000'}/auth/dev-login`
		);
		expect(response.ok()).toBe(true);
	});

	test('renders the "Let\'s get to know you" heading + name field', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { name: /Let's get to know you/i })).toBeVisible();
		await expect(page.getByPlaceholder('Your name')).toBeVisible();
	});

	test('Continue button progresses past the identity step', async ({ page }) => {
		await page.goto('/');
		await page.getByPlaceholder('Your name').fill('Smoke Test');
		await page
			.getByRole('button', { name: /Continue/i })
			.first()
			.click();
		// Step 2 should land on the context heading.
		await expect(page.getByRole('heading', { name: /context/i })).toBeVisible({
			timeout: 5_000,
		});
	});
});
