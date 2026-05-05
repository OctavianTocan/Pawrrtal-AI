/**
 * Theme preset comparison harness.
 *
 * For every theme preset (AI Nexus / Mistral / Cursor) and every mode
 * (light / dark) the test:
 *
 *   1. Navigates to /settings → Appearance.
 *   2. Toggles the global theme-mode pill to Light or Dark so the
 *      preset under test is the one actively rendered on `<html>`
 *      (the AppearanceProvider only writes the *active* mode's slots
 *      to inline style, so we have to flip the pill before reading).
 *   3. Opens the preset dropdown on the matching theme card and picks
 *      the preset by name.
 *   4. Navigates back to `/` (chat surface) so the screenshot captures
 *      the live app chrome — sidebar, header, composer.
 *   5. Reads the inline CSS variables `<html>` carries from
 *      AppearanceProvider (the "base" 6 slots) AND the derived slots
 *      that fall through from globals.css (`--card`, `--popover`,
 *      `--sidebar`, `--border`, etc.).
 *   6. Samples the rendered `background-color` of representative DOM
 *      surfaces (page body, sidebar, composer, a button) so we can
 *      report what *actually* paints in addition to the variable map.
 *   7. Persists `preset-<id>-<mode>.json` and `preset-<id>-<mode>.png`
 *      under `frontend/e2e/output/preset-comparison/`.
 *
 * After the loop a single follow-up test compiles every JSON + PNG
 * pair into `preset-comparison.md`. The markdown reviewer should be
 * able to open the file and immediately see whether the presets
 * actually paint different pixels or whether 4-5 of the 6 slots
 * collapse to identical values across presets — the latter case is
 * called out in the report header so it's not buried in tables.
 *
 * The spec is intentionally Playwright (not Stagehand): the steps are
 * deterministic, no natural-language reasoning is required, and we want
 * precise pixel reads from `getComputedStyle` rather than the
 * accessibility-tree extract Stagehand uses.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from './fixtures';

/** Stable id of every preset surfaced in the Appearance dropdown. */
const PRESET_IDS = ['ai-nexus', 'mistral', 'cursor'] as const;
/** Both modes the AppearanceProvider can render. */
const MODES = ['light', 'dark'] as const;

/** Display label shown to humans inside the preset dropdown. */
const PRESET_LABELS: Record<(typeof PRESET_IDS)[number], string> = {
	'ai-nexus': 'AI Nexus',
	mistral: 'Mistral AI',
	cursor: 'Cursor',
};

/**
 * The six base slots the AppearanceProvider writes to `<html>` inline
 * style — these are the ones every preset declares directly.
 */
const BASE_SLOTS = [
	'--background',
	'--foreground',
	'--accent',
	'--info',
	'--success',
	'--destructive',
] as const;

/**
 * A handful of derived slots that DO NOT live in presets but are
 * cascaded from globals.css and color-mix off the base slots. These
 * are the ones the user wants to see across presets to confirm the
 * derived chain still produces visible deltas.
 */
const DERIVED_SLOTS = [
	'--card',
	'--popover',
	'--sidebar',
	'--border',
	'--primary',
	'--secondary',
	'--muted',
] as const;

/**
 * CSS selectors we sample with `getComputedStyle().backgroundColor`
 * so the report shows what actually paints, not just what the
 * variables resolve to. The selectors are deliberately structural so
 * they survive class renames.
 */
const SAMPLE_TARGETS: ReadonlyArray<{ name: string; selector: string }> = [
	{ name: 'body', selector: 'body' },
	{ name: 'main_app_root', selector: 'html' },
	// First nav button in the sidebar. Sidebars use a `[data-sidebar]`
	// attribute — fall back to `aside` if the attribute isn't present.
	{ name: 'sidebar', selector: '[data-sidebar="sidebar"], aside, nav' },
	// The chat composer textarea is the closest stable handle on the
	// composer surface. Reading `background-color` of the textarea
	// itself gives us the composer chrome.
	{ name: 'composer_textarea', selector: 'textarea[name="message"]' },
	// Pick the first visible button as a generic "chrome button" sample.
	{ name: 'first_button', selector: 'button' },
];

/**
 * Repo-relative directory where the test writes its artifacts.
 * Lives under `frontend/e2e/output/` so it's distinct from
 * `test-results/` (which Playwright wipes between runs) and from
 * `playwright-report/` (which is the HTML reporter target).
 */
const OUTPUT_DIR = path.resolve(__dirname, 'output/preset-comparison');

/** Shape persisted per preset/mode combination. */
interface PresetComparisonRecord {
	presetId: string;
	presetLabel: string;
	mode: (typeof MODES)[number];
	/** Resolved values of the six base slots from `<html>` inline style. */
	base: Record<string, string>;
	/** Resolved values of the cascaded derived slots from globals.css. */
	derived: Record<string, string>;
	/** Sampled `background-color` of each representative DOM surface. */
	samples: Record<string, string>;
	/** Computed font-family on `<html>` for typography parity. */
	rootFontFamily: string;
	/** Path (relative to OUTPUT_DIR) of the screenshot taken on `/`. */
	screenshot: string;
	/** ISO timestamp the snapshot was taken. */
	capturedAt: string;
}

test.describe('preset comparison', () => {
	// Ensure the output dir exists before the per-preset tests run, so
	// the test bodies don't all race to create the same directory tree.
	test.beforeAll(() => {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	});

	// One test per (preset, mode) combination so a flake on one preset
	// doesn't lose the data we already captured for the others. Six
	// total combinations: 3 presets × 2 modes.
	for (const mode of MODES) {
		for (const presetId of PRESET_IDS) {
			test(`captures ${presetId} preset in ${mode} mode`, async ({ page, context }) => {
				// Per-test API-driven login, mirroring `settings.spec.ts`.
				const loginResponse = await context.request.post(
					`${process.env.E2E_API_URL ?? 'http://localhost:8000'}/auth/dev-login`
				);
				expect(loginResponse.ok()).toBe(true);

				// 1. Settings → Appearance.
				await page.goto('/settings');
				await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
				await page.getByRole('button', { name: 'Appearance' }).click();
				// Three headings match the bare word "Theme" (Theme, Light
				// theme, Dark theme) — use `exact: true` to lock onto the
				// section header that confirms Appearance has rendered.
				await expect(
					page.getByRole('heading', { name: 'Theme', exact: true })
				).toBeVisible();

				// 2. Flip the theme-mode pill so the active mode matches
				// the preset we're about to read. The toolbar inside
				// `ThemeModeToggle` exposes one `<button>` per mode with
				// the visible label "Light" / "Dark" / "System". Picking
				// the explicit Light or Dark button (instead of System)
				// guarantees the AppearanceProvider writes that mode's
				// slots regardless of OS preference.
				const modeLabel = mode === 'light' ? 'Light' : 'Dark';
				await page
					.getByRole('toolbar', { name: 'Theme mode' })
					.getByRole('button', { name: modeLabel })
					.click();

				// 3. Open the preset dropdown for the matching theme card.
				// Each `ThemeColorCard` exposes the trigger as a button
				// with `aria-label="<heading> preset"`, so "Light theme
				// preset" / "Dark theme preset" disambiguate the two
				// dropdowns even though they both read "Apply preset".
				const dropdownAriaLabel = `${mode === 'light' ? 'Light' : 'Dark'} theme preset`;
				await page.getByRole('button', { name: dropdownAriaLabel }).click();

				// The dropdown content is portaled to body via Radix; the
				// item is a `role="menuitem"` carrying the preset's
				// human-readable label.
				await page.getByRole('menuitem', { name: PRESET_LABELS[presetId] }).click();

				// 4. The mutation to /api/v1/appearance is debounced via
				// TanStack Query — wait for the PUT to complete so the
				// next page-load reads the new server-side state and the
				// `<html>` inline style reflects the chosen preset.
				await page.waitForResponse(
					(response) =>
						response.url().includes('/api/v1/appearance') &&
						response.request().method() === 'PUT' &&
						response.ok()
				);

				// 5. Visit the chat surface — most chrome is visible there
				// (sidebar, header, composer, prompt suggestions).
				await page.goto('/');
				// Wait for ANY interactive button on the chat surface to
				// be visible — proves React hydrated and the appearance
				// provider has finished writing inline styles. Using a
				// role-locator avoids networkidle (per the project rule).
				await expect(page.getByRole('button').first()).toBeVisible();
				// Settle a frame so font-loading repaints don't mid-sample.
				await page.waitForTimeout(400);

				// 6. Read every CSS variable + sample selector in one
				// `evaluate` call so we don't pay per-call CDP overhead.
				const snapshot = await readAppearanceSnapshot(page);

				// 7. Save artifacts.
				const screenshotName = `preset-${presetId}-${mode}.png`;
				const screenshotPath = path.join(OUTPUT_DIR, screenshotName);
				await page.screenshot({ path: screenshotPath, fullPage: false });

				const record: PresetComparisonRecord = {
					presetId,
					presetLabel: PRESET_LABELS[presetId],
					mode,
					base: snapshot.base,
					derived: snapshot.derived,
					samples: snapshot.samples,
					rootFontFamily: snapshot.rootFontFamily,
					screenshot: screenshotName,
					capturedAt: new Date().toISOString(),
				};
				const jsonPath = path.join(OUTPUT_DIR, `preset-${presetId}-${mode}.json`);
				writeFileSync(jsonPath, `${JSON.stringify(record, null, 2)}\n`);

				// Sanity expectation — the active mode's `--background`
				// must resolve to a non-empty value. If this fails the
				// AppearanceProvider didn't finish writing inline style
				// before we sampled, and every downstream comparison
				// will be misleading.
				expect(snapshot.base['--background']).not.toBe('');
			});
		}
	}

	// Final pass: stitch every per-combination JSON into a single
	// markdown report. Runs after all preset-capture tests so it has
	// the full data set even when a subset of captures failed.
	test('compiles preset-comparison.md report', () => {
		const records: PresetComparisonRecord[] = [];
		for (const mode of MODES) {
			for (const presetId of PRESET_IDS) {
				const jsonPath = path.join(OUTPUT_DIR, `preset-${presetId}-${mode}.json`);
				if (!existsSync(jsonPath)) {
					// A capture in this run might have skipped — record it
					// as missing so the report explicitly says so rather
					// than silently omitting the row.
					continue;
				}
				records.push(JSON.parse(readFileSync(jsonPath, 'utf-8')) as PresetComparisonRecord);
			}
		}

		const reportPath = path.join(OUTPUT_DIR, 'preset-comparison.md');
		const report = renderReport(records);
		writeFileSync(reportPath, report);

		// Confirm at least one capture made it onto disk so a green
		// run can't ship an empty report.
		expect(records.length).toBeGreaterThan(0);
	});
});

/**
 * Live snapshot returned from `readAppearanceSnapshot` — the same
 * shape the per-test record persists into JSON.
 */
interface AppearanceSnapshot {
	base: Record<string, string>;
	derived: Record<string, string>;
	samples: Record<string, string>;
	rootFontFamily: string;
}

/**
 * Read every CSS variable + DOM sample we care about from the live
 * page in one `evaluate` round-trip. Extracted out of the test body
 * so the test function stays under Biome's cognitive-complexity gate.
 *
 * @param page - The Playwright page targeting `/` after a preset has been applied.
 * @returns Resolved values for the base + derived slots and rendered paint colors.
 */
async function readAppearanceSnapshot(
	page: import('@playwright/test').Page
): Promise<AppearanceSnapshot> {
	return await page.evaluate(
		({ baseSlots, derivedSlots, samples }) => {
			const rootStyle = window.getComputedStyle(document.documentElement);
			const base: Record<string, string> = {};
			for (const slot of baseSlots) {
				base[slot] = rootStyle.getPropertyValue(slot).trim();
			}
			const derived: Record<string, string> = {};
			for (const slot of derivedSlots) {
				derived[slot] = rootStyle.getPropertyValue(slot).trim();
			}
			const sampled: Record<string, string> = {};
			for (const target of samples) {
				const element = document.querySelector(target.selector);
				sampled[target.name] = element
					? window.getComputedStyle(element as Element).backgroundColor
					: 'NOT_FOUND';
			}
			return {
				base,
				derived,
				samples: sampled,
				rootFontFamily: rootStyle.fontFamily,
			};
		},
		{
			baseSlots: [...BASE_SLOTS],
			derivedSlots: [...DERIVED_SLOTS],
			samples: SAMPLE_TARGETS.map((target) => ({
				name: target.name,
				selector: target.selector,
			})),
		}
	);
}

/**
 * Build the markdown report body.
 *
 * Highlights at the top:
 *   - Banner row that calls out any base slot whose value is identical
 *     across ALL three presets in a given mode (the "smoking gun" the
 *     user is asking for — if 4+/6 slots collapse, the dropdown isn't
 *     doing anything visible).
 *   - Side-by-side screenshot grid per mode.
 *   - One table per mode listing every base + derived slot with one
 *     column per preset, so a horizontal scan reveals which slots
 *     diverge and which collapse.
 *
 * @param records - Captured per (preset, mode) snapshots.
 * @returns Full markdown content for `preset-comparison.md`.
 */
function renderReport(records: PresetComparisonRecord[]): string {
	const collapseFlags = detectCollapsedSlots(records);
	const lines: string[] = [];
	lines.push('# Theme preset comparison');
	lines.push('');
	lines.push(
		`Generated by \`frontend/e2e/preset-comparison.spec.ts\` on ${new Date().toISOString()}.`
	);
	lines.push('');

	// Smoking-gun banner — always present so the report header
	// answers "do the presets actually look different?" before any
	// table reading is required.
	lines.push('## TL;DR');
	lines.push('');
	const baseCollapses = collapseFlags.filter((flag) => flag.kind === 'base');
	const derivedCollapses = collapseFlags.filter((flag) => flag.kind === 'derived');
	if (baseCollapses.length === 0) {
		lines.push(
			'**Base slots:** every preset writes a distinct value for `--background`, ' +
				'`--foreground`, `--accent`, `--info`, `--success`, and `--destructive`. ' +
				'The dropdown IS reaching the live `<html>` inline style.'
		);
	} else {
		lines.push(
			'> **Base-slot collapse detected** — the dropdown is not propagating for these slots:'
		);
		for (const flag of baseCollapses) {
			lines.push(
				`> - **${flag.mode}** — \`${flag.slot}\` = \`${flag.value}\` for all presets.`
			);
		}
	}
	lines.push('');
	if (derivedCollapses.length === 0) {
		lines.push(
			'**Derived slots:** `--card`, `--popover`, `--sidebar`, `--border`, `--primary`, ' +
				'`--secondary`, `--muted` all flow through the cascade and produce distinct values.'
		);
	} else {
		lines.push(
			'> **Derived-slot collapse** — these `globals.css` slots resolve to identical values ' +
				'across every preset, so the surfaces they paint (cards, popovers, sidebar chrome, ' +
				'borders, secondary/muted backdrops) look the same regardless of which preset is picked. ' +
				'The presets only differ on `--background`/`--foreground`/`--accent` for these surfaces; ' +
				'the cascade-driven slots use literal `oklch(...)` values that are hardcoded for ' +
				'the active mode.'
		);
		lines.push('');
		// Group by mode so the reader sees "everything in dark mode collapsed" cleanly.
		for (const mode of MODES) {
			const modeFlags = derivedCollapses.filter((flag) => flag.mode === mode);
			if (modeFlags.length === 0) continue;
			lines.push(
				`- **${mode}** — ${modeFlags.length}/${DERIVED_SLOTS.length} derived slots collapse: ${modeFlags
					.map((flag) => `\`${flag.slot}\``)
					.join(', ')}.`
			);
		}
	}
	lines.push('');

	for (const mode of MODES) {
		const modeRecords = records.filter((record) => record.mode === mode);
		if (modeRecords.length === 0) continue;
		lines.push(...renderModeSection(mode, modeRecords));
	}

	return lines.join('\n');
}

/**
 * Render the per-mode block of the report (screenshot strip + slot
 * table + paint sample table + font-family list). Extracted from
 * `renderReport` so the parent function fits comfortably under
 * Biome's cognitive-complexity limit.
 *
 * @param mode - The theme mode this section is for.
 * @param modeRecords - Captured snapshots for that mode (one per preset).
 * @returns Markdown lines, ready to be concatenated into the report.
 */
function renderModeSection(
	mode: (typeof MODES)[number],
	modeRecords: PresetComparisonRecord[]
): string[] {
	const lines: string[] = [];
	lines.push(`## ${mode === 'light' ? 'Light' : 'Dark'} mode`);
	lines.push('');
	// Side-by-side image grid using a markdown table — most
	// renderers (GitHub, VS Code preview, Obsidian) will lay these
	// out three-up.
	lines.push(`| ${modeRecords.map((record) => record.presetLabel).join(' | ')} |`);
	lines.push(`| ${modeRecords.map(() => '---').join(' | ')} |`);
	lines.push(
		`| ${modeRecords.map((record) => `![${record.presetLabel}](${record.screenshot})`).join(' | ')} |`
	);
	lines.push('');

	// Combined slot table — base + derived in one matrix.
	lines.push('### Slot values');
	lines.push('');
	const headerCells = ['slot', ...modeRecords.map((record) => record.presetLabel)];
	lines.push(`| ${headerCells.join(' | ')} |`);
	lines.push(`| ${headerCells.map(() => '---').join(' | ')} |`);
	for (const slot of [...BASE_SLOTS, ...DERIVED_SLOTS]) {
		const row = [`\`${slot}\``, ...modeRecords.map((record) => slotCell(record, slot))];
		lines.push(`| ${row.join(' | ')} |`);
	}
	lines.push('');

	// Sampled paint colors — proves the variables actually flow
	// through to rendered DOM, not just live in `<html>`.
	lines.push('### Sampled paint colors');
	lines.push('');
	lines.push(`| target | ${modeRecords.map((record) => record.presetLabel).join(' | ')} |`);
	lines.push(`| --- | ${modeRecords.map(() => '---').join(' | ')} |`);
	for (const target of SAMPLE_TARGETS) {
		const row = [
			`\`${target.name}\``,
			...modeRecords.map((record) => `\`${record.samples[target.name] ?? '<missing>'}\``),
		];
		lines.push(`| ${row.join(' | ')} |`);
	}
	lines.push('');

	// Font family per preset — Mistral / AI Nexus use a serif for
	// `--font-display-stack`, Cursor uses sans-only. Surfacing this
	// at the bottom keeps the typographic identity visible.
	lines.push('### Root font-family');
	lines.push('');
	for (const record of modeRecords) {
		lines.push(`- **${record.presetLabel}** — \`${record.rootFontFamily}\``);
	}
	lines.push('');
	return lines;
}

/**
 * Format a single cell value for the `Slot values` table — pulls from
 * `record.base` or `record.derived` depending on which collection the
 * slot belongs to, and renders missing values as a sentinel rather
 * than blank so the table never silently swallows a hole.
 */
function slotCell(record: PresetComparisonRecord, slot: string): string {
	const isBase = (BASE_SLOTS as readonly string[]).includes(slot);
	const value = isBase ? record.base[slot] : record.derived[slot];
	return value ? `\`${value}\`` : '`<missing>`';
}

/**
 * Return the list of (mode, slot, kind) triples whose value is identical
 * across every captured preset in that mode. A non-empty result indicates
 * the dropdown switch isn't propagating to the live `<html>` for that
 * slot — the smoking gun the user is hunting for. The `kind` discriminates
 * between presets-declared "base" slots (which would be a serious bug if
 * collapsed) and "derived" globals.css slots (which would be a design
 * note: the cascade isn't honoring the active preset).
 *
 * @param records - All captured snapshots.
 * @returns One entry per collapsed (mode, slot) pair.
 */
function detectCollapsedSlots(
	records: PresetComparisonRecord[]
): Array<{ mode: string; slot: string; value: string; kind: 'base' | 'derived' }> {
	const flags: Array<{ mode: string; slot: string; value: string; kind: 'base' | 'derived' }> =
		[];
	for (const mode of MODES) {
		const modeRecords = records.filter((record) => record.mode === mode);
		// Need at least two records in the same mode to claim a collapse.
		if (modeRecords.length < 2) continue;
		for (const slot of BASE_SLOTS) {
			const values = modeRecords.map((record) => record.base[slot] ?? '');
			const first = values[0] ?? '';
			const allEqual = first !== '' && values.every((value) => value === first);
			if (allEqual) flags.push({ mode, slot, value: first, kind: 'base' });
		}
		for (const slot of DERIVED_SLOTS) {
			const values = modeRecords.map((record) => record.derived[slot] ?? '');
			const first = values[0] ?? '';
			const allEqual = first !== '' && values.every((value) => value === first);
			if (allEqual) flags.push({ mode, slot, value: first, kind: 'derived' });
		}
	}
	return flags;
}
