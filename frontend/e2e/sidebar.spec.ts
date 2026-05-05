/**
 * Sidebar smoke: open, close, and project header visibility.
 *
 * Multi-select + drag-and-drop need a richer fixture (a real
 * conversation list seeded via the backend) — split into a follow-up
 * suite once the seed helper lands.
 */

import { expect, test } from './fixtures';

test.describe('sidebar', () => {
	test.beforeEach(async ({ context }) => {
		const response = await context.request.post(
			`${process.env.E2E_API_URL ?? 'http://localhost:8000'}/auth/dev-login`
		);
		expect(response.ok()).toBe(true);
	});

	test('renders the Projects header + create-project button', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: /Projects/i }).first()).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create new project' })).toBeAttached();
	});

	test('opens the Create project modal with a name input', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Create new project' }).click({ force: false });
		await expect(page.getByRole('heading', { name: 'Create project' })).toBeVisible();
		await expect(page.getByLabel('Project name')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create project' })).toBeDisabled();
	});
});
