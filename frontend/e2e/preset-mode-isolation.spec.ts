/**
 * Cross-mode preset bleed regression.
 *
 * The bug: `AppearanceSection.applyLightPreset` and `applyDarkPreset`
 * both forward `preset.fonts` and `preset.options` into the appearance
 * payload. Fonts and options are GLOBAL (not per-mode), so applying a
 * Mistral preset to the *Light* card while the active mode is Dark
 * mutates the dark-mode UI's typography. The same is true for color
 * tokens written through the global cascade — they should not leak
 * across modes either.
 *
 * What this spec asserts:
 *
 *   1. In dark mode, applying a preset to the **Light** card does not
 *      change the dark-mode `--font-display-stack`, `--font-sans-stack`,
 *      or `--font-mono-stack` on `<html>`.
 *   2. In dark mode, applying a preset to the **Light** card does not
 *      change the dark-mode `--background` / `--accent` slots.
 *   3. Symmetric checks running in light mode while applying to the
 *      **Dark** card.
 *
 * The spec is intentionally *narrow* — it does NOT capture screenshots
 * or build a comparison report (that's preset-comparison.spec.ts's
 * job). The single goal is to fail loudly when a per-mode preset apply
 * leaks into the other mode's typography or color slots.
 *
 * The spec is Playwright (not Stagehand) because every step is
 * deterministic: flip a pill, open a dropdown, pick a label, then read
 * `getComputedStyle(document.documentElement)`.
 */

import { expect, test } from './fixtures';

/**
 * Both modes the AppearanceProvider can render. Source of truth for the
 * loop in this spec — keep aligned with `AppearanceMode` in
 * `frontend/features/appearance/types.ts`.
 */
const MODES = ['light', 'dark'] as const;

/** Mode the test starts in (the "victim" — must NOT be mutated). */
type VictimMode = (typeof MODES)[number];

/**
 * The font CSS variables AppearanceProvider writes to `<html>` inline
 * style. These are GLOBAL, not per-mode — the bug is that an apply on
 * one mode card forwards `preset.fonts` and clobbers them.
 */
const FONT_SLOTS = ['--font-display-stack', '--font-sans-stack', '--font-mono-stack'] as const;

/**
 * Color slots that AppearanceProvider writes per-mode. They MUST stay
 * identical when a preset is applied to the OTHER mode card.
 */
const COLOR_SLOTS = ['--background', '--accent'] as const;

/**
 * Label of the preset we reset BOTH cards to before each scenario so
 * the "before" snapshot is the AI Nexus default (Newsreader display
 * serif, system sans/mono, OKLCH colors). Without this baseline, a
 * previous run that happened to leave the DB on Cursor would defeat
 * the test — applying Cursor again would be a fonts no-op.
 */
const BASELINE_PRESET_LABEL = 'AI Nexus';

/**
 * Which preset to apply to which OTHER-mode card during each scenario.
 *
 * Both scenarios use the **Cursor** preset deliberately: Cursor is the
 * only preset whose typography (Geist + Geist Mono) differs from the
 * AI Nexus baseline (Newsreader serif + system sans/mono). Mistral
 * and AI Nexus share an identical font stack, so applying Mistral to
 * the OTHER card would never produce a font delta even if the bleed
 * bug were present — the test would pass for the wrong reason.
 */
const SCENARIOS = [
	{
		victim: 'dark',
		offenderMode: 'light',
		offenderPresetLabel: 'Cursor',
	},
	{
		victim: 'light',
		offenderMode: 'dark',
		offenderPresetLabel: 'Cursor',
	},
] as const satisfies ReadonlyArray<{
	victim: VictimMode;
	offenderMode: VictimMode;
	offenderPresetLabel: string;
}>;

/**
 * Snapshot returned from `readSlots` — the values of every font + color
 * slot we care about, read directly from `<html>` inline style via
 * `getComputedStyle`.
 */
interface SlotSnapshot {
	/** Resolved values of the global font-stack variables. */
	fonts: Record<string, string>;
	/** Resolved values of the per-mode color slots. */
	colors: Record<string, string>;
}

/**
 * Read every font + color slot we track in a single round-trip so the
 * before/after snapshots are taken at identical layout times.
 *
 * @param page - Playwright page targeting any signed-in surface.
 * @returns Resolved CSS variable values from `<html>`.
 */
async function readSlots(page: import('@playwright/test').Page): Promise<SlotSnapshot> {
	return await page.evaluate(
		({ fontSlots, colorSlots }) => {
			const rootStyle = window.getComputedStyle(document.documentElement);
			const fonts: Record<string, string> = {};
			for (const slot of fontSlots) {
				fonts[slot] = rootStyle.getPropertyValue(slot).trim();
			}
			const colors: Record<string, string> = {};
			for (const slot of colorSlots) {
				colors[slot] = rootStyle.getPropertyValue(slot).trim();
			}
			return { fonts, colors };
		},
		{
			fontSlots: [...FONT_SLOTS],
			colorSlots: [...COLOR_SLOTS],
		}
	);
}

/**
 * Activate a specific theme mode on the Appearance page by clicking
 * the corresponding pill in the `Theme mode` toolbar, then wait until
 * the AppearanceProvider has actually toggled the `.dark` class on
 * `<html>` so the next slot read sees the active-mode colors rather
 * than stale ones from the previous mode.
 *
 * Mirrors the helper inline in `preset-comparison.spec.ts` — kept
 * local so the two specs stay independent.
 *
 * @param page - Playwright page on the Appearance settings panel.
 * @param mode - Mode to activate.
 */
async function activateMode(
	page: import('@playwright/test').Page,
	mode: VictimMode
): Promise<void> {
	const label = mode === 'light' ? 'Light' : 'Dark';
	await page
		.getByRole('toolbar', { name: 'Theme mode' })
		.getByRole('button', { name: label })
		.click();
	// AppearanceProvider toggles the `.dark` class on `<html>` in the
	// same effect that writes the per-mode color slots — waiting on the
	// class transition guarantees the slot snapshot we take next is the
	// new mode's, not a stale value from the previous mode.
	const expectClassMatch = mode === 'dark' ? /(^|\s)dark(\s|$)/ : /^((?!dark).)*$/;
	await expect(page.locator('html')).toHaveClass(expectClassMatch);
}

/**
 * Open the preset dropdown on a given mode's theme card and pick the
 * preset by its visible label.
 *
 * @param page - Playwright page on the Appearance settings panel.
 * @param mode - Which mode card's preset dropdown to open.
 * @param presetLabel - Visible label of the preset menuitem to click.
 */
async function applyPresetToCard(
	page: import('@playwright/test').Page,
	mode: VictimMode,
	presetLabel: string
): Promise<void> {
	const cardLabel = mode === 'light' ? 'Light theme preset' : 'Dark theme preset';
	await page.getByRole('button', { name: cardLabel }).click();
	// The dropdown content is portaled to body via Radix; the item is a
	// `role="menuitem"` carrying the preset's human-readable label.
	await page.getByRole('menuitem', { name: presetLabel }).click();

	// The mutation to /api/v1/appearance is debounced via TanStack
	// Query — wait for the PUT to complete so the next slot read sees
	// the post-apply state, not the pre-apply state.
	await page.waitForResponse(
		(response) =>
			response.url().includes('/api/v1/appearance') &&
			response.request().method() === 'PUT' &&
			response.ok()
	);
}

test.describe('preset apply mode isolation', () => {
	for (const scenario of SCENARIOS) {
		test(`applying ${scenario.offenderPresetLabel} to ${scenario.offenderMode} mode does not mutate ${scenario.victim} mode fonts or colors`, async ({
			page,
			context,
		}) => {
			// Per-test API-driven login, mirroring `settings.spec.ts` —
			// the dev-login endpoint is the project's standard way to
			// skip the UI signup form per the api-setup-not-ui rule.
			const loginResponse = await context.request.post(
				`${process.env.E2E_API_URL ?? 'http://localhost:8000'}/auth/dev-login`
			);
			expect(loginResponse.ok()).toBe(true);

			// Settings → Appearance.
			await page.goto('/settings');
			await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
			await page.getByRole('button', { name: 'Appearance' }).click();
			// Three headings match the bare word "Theme" (Theme, Light
			// theme, Dark theme) — `exact: true` locks onto the section
			// header that confirms Appearance has rendered.
			await expect(page.getByRole('heading', { name: 'Theme', exact: true })).toBeVisible();

			// 1. Reset BOTH mode cards to the AI Nexus baseline so the
			//    test starts from a known state regardless of what
			//    previous runs left in the DB. Without this, a run of
			//    `preset-comparison.spec.ts` that ended on Cursor would
			//    silently defeat this test (applying Cursor to the
			//    other card would not change fonts).
			//
			//    We flip into each mode in turn before applying so the
			//    AppearanceProvider's "active mode" writes the matching
			//    slots — the per-card preset apply itself doesn't care
			//    about the active mode, but flipping keeps the UI in a
			//    deterministic post-baseline state.
			await activateMode(page, 'light');
			await applyPresetToCard(page, 'light', BASELINE_PRESET_LABEL);
			await activateMode(page, 'dark');
			await applyPresetToCard(page, 'dark', BASELINE_PRESET_LABEL);

			// 2. Activate the VICTIM mode so the AppearanceProvider
			//    writes that mode's slots to `<html>` inline style.
			//    We need the victim mode to be the actively rendered
			//    one so the font/color slots we read belong to it.
			await activateMode(page, scenario.victim);
			// Settle a frame so the AppearanceProvider's effect lands
			// before we read.
			await page.waitForTimeout(400);

			// 3. Snapshot the victim mode's slots BEFORE the offending
			//    preset apply — this is the baseline that must survive.
			const before = await readSlots(page);

			// Sanity: every tracked slot should resolve to a non-empty
			// value, otherwise the AppearanceProvider hasn't finished
			// writing inline style and the comparison is meaningless.
			for (const slot of FONT_SLOTS) {
				expect(before.fonts[slot], `${slot} should be resolved before apply`).not.toBe('');
			}
			for (const slot of COLOR_SLOTS) {
				expect(before.colors[slot], `${slot} should be resolved before apply`).not.toBe('');
			}

			// 4. Apply the offending preset to the OTHER mode's card.
			//    The active mode (`scenario.victim`) does NOT change —
			//    the AppearanceProvider should keep writing the victim
			//    mode's slots to `<html>` exactly as before.
			await applyPresetToCard(page, scenario.offenderMode, scenario.offenderPresetLabel);
			// Allow one frame for the AppearanceProvider effect to
			// react to the new server-side state — TanStack Query
			// invalidates after the PUT and re-renders the provider.
			await page.waitForTimeout(600);

			// 5. Snapshot the victim mode's slots AFTER the apply.
			const after = await readSlots(page);

			// Diagnostic — surface the actual values when the test
			// fails so the report tells us what bled, not just that
			// "they differ". Playwright's reporter prints stdout lines
			// alongside the failure.
			console.log(
				`[preset-mode-isolation] victim=${scenario.victim} offender=${scenario.offenderMode}/${scenario.offenderPresetLabel}`
			);
			console.log('  before.fonts:', JSON.stringify(before.fonts));
			console.log('  after.fonts: ', JSON.stringify(after.fonts));
			console.log('  before.colors:', JSON.stringify(before.colors));
			console.log('  after.colors: ', JSON.stringify(after.colors));

			// 5. Assert no font slot moved. This is the smoking gun for
			//    the bug the user reported — `applyLightPreset` /
			//    `applyDarkPreset` forward `preset.fonts` and the
			//    AppearanceProvider writes them globally.
			expect(
				after.fonts,
				`Font slots changed in ${scenario.victim} mode after applying ${scenario.offenderPresetLabel} to the ${scenario.offenderMode} card. Fonts must be edited explicitly via the typography section, not as a side-effect of a per-mode preset apply.`
			).toEqual(before.fonts);

			// 6. Assert no color slot moved. The active mode's color
			//    slots are written by AppearanceProvider — applying a
			//    preset to the OTHER mode's card must not invalidate
			//    them. Failure here would mean the cascade is leaking
			//    OTHER-mode colors into the active mode's `<html>`
			//    inline style.
			expect(
				after.colors,
				`Color slots changed in ${scenario.victim} mode after applying ${scenario.offenderPresetLabel} to the ${scenario.offenderMode} card. Per-mode color slots must not leak across modes.`
			).toEqual(before.colors);
		});
	}
});
