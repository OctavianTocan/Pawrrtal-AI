'use client';

/**
 * Settings → Appearance — live, persisted, user-customizable theme.
 *
 * Every control writes through to `/api/v1/appearance` via TanStack
 * Query and the resolved values land on `<html>` as CSS custom
 * properties through `<AppearanceProvider>` (mounted in
 * `app/providers.tsx`). That means changes show up across the entire
 * app the moment the mutation succeeds — sidebar, chat, modals,
 * popovers, everything reads the same `--background` /
 * `--foreground` / `--accent` slots.
 *
 * Defaults are the Mistral-inspired sunlit-cream palette baked into
 * `frontend/features/appearance/defaults.ts`. The pill picker (entire
 * pill background = the resolved color, hex literal floats on top
 * with auto-contrasting text) follows the Codex settings reference.
 */

import { type ReactNode, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { SelectButton, type SelectButtonOption } from '@/components/ui/select-button';
import {
	type AppearanceFonts,
	type AppearanceOptions,
	COLOR_SLOTS,
	type ColorSlot,
	DEFAULT_APPEARANCE,
	FONT_SLOTS,
	type FontSlot,
	resolveAppearance,
	THEME_PRESETS,
	type ThemeColors,
	type ThemeMode,
	type ThemePreset,
	useAppearance,
	useUpdateAppearance,
} from '@/features/appearance';
import { cn } from '@/lib/utils';
import {
	SettingsCard,
	SettingsPage,
	SettingsRow,
	SettingsSectionHeader,
	Slider,
	Switch,
} from '../primitives';
import { ColorRow, FontRow } from './AppearanceRows';
import { buildPayload, COLOR_LABELS, FONT_LABELS, THEME_MODE_OPTIONS } from './appearance-helpers';

/**
 * Top-of-card theme-mode switcher.
 *
 * Uses `aria-pressed` so screen readers announce the toggle state.
 * Transition is 150ms — `duration-press-hover` from the UI wiki
 * (120-180ms range for press/hover state changes).
 */
function ThemeModeToggle({
	value,
	onChange,
}: {
	value: ThemeMode;
	onChange: (mode: ThemeMode) => void;
}): React.JSX.Element {
	return (
		<div
			aria-label="Theme mode"
			className="flex items-center gap-1 rounded-[8px] border border-border/50 bg-foreground/[0.03] p-0.5"
			role="toolbar"
		>
			{THEME_MODE_OPTIONS.map((option) => {
				const isActive = value === option.id;
				return (
					<button
						aria-pressed={isActive}
						className={cn(
							'flex cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium',
							'transition-colors duration-150 ease-out',
							isActive
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground'
						)}
						key={option.id}
						onClick={() => onChange(option.id)}
						type="button"
					>
						<option.Icon aria-hidden="true" className="size-3.5" />
						<span>{option.label}</span>
					</button>
				);
			})}
		</div>
	);
}

/** Props for the per-mode theme card. */
interface ThemeColorCardProps {
	heading: string;
	description: string;
	overrides: ThemeColors;
	resolvedColors: Record<ColorSlot, string>;
	defaults: Record<ColorSlot, string>;
	mode: 'light' | 'dark';
	onSlotCommit: (slot: ColorSlot, next: string | null) => void;
	onPresetApply: (preset: ThemePreset) => void;
	footer?: ReactNode;
}

/**
 * Renders one of the two themed cards (Light / Dark) with its 6 color
 * rows and a header-level preset picker.
 *
 * The preset picker is per-mode by design — picking "Mistral" in Light
 * leaves Dark untouched, so the user can mix-and-match (e.g. Mistral
 * Light + Cursor Dark). Each option in the dropdown shows a small
 * `Aa` glyph rendered in that preset's display font, mirroring the
 * Codex Appearance reference where each row previews the theme's
 * typography in-line.
 */
function ThemeColorCard({
	heading,
	description,
	overrides,
	resolvedColors,
	defaults,
	mode: _mode,
	onSlotCommit,
	onPresetApply,
	footer,
}: ThemeColorCardProps): React.JSX.Element {
	const options = useMemo<SelectButtonOption[]>(
		() =>
			THEME_PRESETS.map((preset) => ({
				id: preset.id,
				label: preset.name,
				description: preset.description,
				leading: (
					<span
						aria-hidden="true"
						className="flex size-5 items-center justify-center rounded-[5px] border border-border/40 bg-background text-[11px] font-medium leading-none text-foreground"
						style={{ fontFamily: preset.fonts.display }}
					>
						Aa
					</span>
				),
			})),
		[]
	);
	const handleSelect = useCallback(
		(presetId: string) => {
			const preset = THEME_PRESETS.find((entry) => entry.id === presetId);
			if (preset) onPresetApply(preset);
		},
		[onPresetApply]
	);

	return (
		<SettingsCard>
			<SettingsSectionHeader
				actions={
					<SelectButton
						ariaLabel={`${heading} preset`}
						onSelect={handleSelect}
						options={options}
						triggerLabel="Apply preset"
					/>
				}
				description={description}
				title={heading}
			/>
			{COLOR_SLOTS.map((slot) => (
				<ColorRow
					defaultValue={defaults[slot]}
					key={slot}
					label={COLOR_LABELS[slot]}
					onCommit={(next) => onSlotCommit(slot, next)}
					overrideValue={overrides[slot]}
					resolvedValue={resolvedColors[slot]}
				/>
			))}
			{footer}
		</SettingsCard>
	);
}

/** Props for the {@link TypographyCard}. */
interface TypographyCardProps {
	overrides: AppearanceFonts;
	uiFontSize: number;
	onFontCommit: (slot: FontSlot, next: string | null) => void;
	onUiFontSize: (next: number) => void;
}

/**
 * Typography card — font-family rows for each slot plus the UI base
 * font-size input. Extracted from {@link AppearanceSection} so the
 * outer component stays under the project's per-function line budget.
 */
function TypographyCard({
	overrides,
	uiFontSize,
	onFontCommit,
	onUiFontSize,
}: TypographyCardProps): React.JSX.Element {
	return (
		<SettingsCard>
			<SettingsSectionHeader
				description="Font families and base size that drive the type system across the app."
				title="Typography"
			/>
			{FONT_SLOTS.map((slot) => (
				<FontRow
					defaultValue={DEFAULT_APPEARANCE.fonts[slot]}
					key={slot}
					label={FONT_LABELS[slot]}
					onCommit={(next) => onFontCommit(slot, next)}
					overrideValue={overrides[slot]}
				/>
			))}
			<SettingsRow
				description="Drives every rem-denominated value across the app."
				label="UI font size"
			>
				<div className="flex items-center gap-2">
					<Input
						aria-label="UI font size in pixels"
						className="w-16 text-right text-sm tabular-nums"
						max={32}
						min={10}
						onChange={(event) => {
							const next = Number.parseInt(event.target.value, 10);
							if (Number.isFinite(next)) onUiFontSize(next);
						}}
						type="number"
						value={uiFontSize}
					/>
					<span className="text-xs text-muted-foreground">px</span>
				</div>
			</SettingsRow>
		</SettingsCard>
	);
}

/** Props for the {@link BehaviorCard}. */
interface BehaviorCardProps {
	pointerCursors: boolean;
	translucentSidebar: boolean;
	contrast: number;
	onOptionChange: <K extends keyof AppearanceOptions>(key: K, next: AppearanceOptions[K]) => void;
}

/**
 * Behavior card — cross-mode interaction toggles + the global
 * contrast slider. Extracted alongside {@link TypographyCard} so the
 * outer {@link AppearanceSection} body fits comfortably under the
 * 120-line per-function ceiling.
 */
function BehaviorCard({
	pointerCursors,
	translucentSidebar,
	contrast,
	onOptionChange,
}: BehaviorCardProps): React.JSX.Element {
	return (
		<SettingsCard>
			<SettingsSectionHeader
				description="Interaction defaults that aren't tied to a specific palette or font."
				title="Behavior"
			/>
			<SettingsRow
				description="Change the cursor to a pointer when hovering over interactive elements."
				label="Use pointer cursors"
			>
				<Switch
					checked={pointerCursors}
					onCheckedChange={(checked) => onOptionChange('pointer_cursors', checked)}
				/>
			</SettingsRow>
			<SettingsRow
				description="Use a glass-style backdrop on the sidebar when scenic mode is enabled."
				label="Translucent sidebar"
			>
				<Switch
					checked={translucentSidebar}
					onCheckedChange={(checked) => onOptionChange('translucent_sidebar', checked)}
				/>
			</SettingsRow>
			<SettingsRow
				description="Boosts mid-tone separation across the entire UI. Higher values render bolder borders and stronger contrast on hover states."
				label="Contrast"
			>
				<div className="flex w-56 items-center gap-3">
					<Slider
						max={100}
						min={0}
						onValueChange={(values) => {
							const next = values[0];
							if (typeof next === 'number') onOptionChange('contrast', next);
						}}
						step={1}
						value={[contrast]}
					/>
					<span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
						{contrast}
					</span>
				</div>
			</SettingsRow>
		</SettingsCard>
	);
}

/**
 * Live, persisted Appearance settings section.
 *
 * Reads the user's saved overrides via TanStack Query, resolves them
 * against the Mistral defaults, and pipes any change back through a
 * debounced PUT mutation. The provider in `app/providers.tsx` reacts
 * to the mutated cache and rewrites `<html>` CSS variables, so the
 * preview is the live app.
 */
export function AppearanceSection(): React.JSX.Element {
	const { data } = useAppearance();
	const { mutate: updateAppearance } = useUpdateAppearance();

	// Resolve once per render so both the swatches and the underlying
	// CSS variables agree on what's "active". `data` may be undefined
	// during the first request — `resolveAppearance` handles that and
	// hands back the Mistral defaults.
	const resolved = useMemo(() => resolveAppearance(data), [data]);

	// Helpers that build a fresh payload with one slice changed and
	// dispatch the mutation. All four routes call `buildPayload` so
	// the request shape stays identical across surfaces.
	const overrides = data ?? {
		light: {},
		dark: {},
		fonts: {},
		options: {},
	};

	const setLightSlot = useCallback(
		(slot: ColorSlot, next: string | null) => {
			const nextLight: ThemeColors = { ...overrides.light, [slot]: next };
			updateAppearance(
				buildPayload(nextLight, overrides.dark, overrides.fonts, overrides.options)
			);
		},
		[overrides.dark, overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);
	const setDarkSlot = useCallback(
		(slot: ColorSlot, next: string | null) => {
			const nextDark: ThemeColors = { ...overrides.dark, [slot]: next };
			updateAppearance(
				buildPayload(overrides.light, nextDark, overrides.fonts, overrides.options)
			);
		},
		[overrides.dark, overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);
	const setFontSlot = useCallback(
		(slot: FontSlot, next: string | null) => {
			const nextFonts: AppearanceFonts = { ...overrides.fonts, [slot]: next };
			updateAppearance(
				buildPayload(overrides.light, overrides.dark, nextFonts, overrides.options)
			);
		},
		[overrides.dark, overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);
	const setOption = useCallback(
		<K extends keyof AppearanceOptions>(key: K, next: AppearanceOptions[K]) => {
			const nextOptions: AppearanceOptions = { ...overrides.options, [key]: next };
			updateAppearance(
				buildPayload(overrides.light, overrides.dark, overrides.fonts, nextOptions)
			);
		},
		[overrides.dark, overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);

	const themeMode = resolved.options.theme_mode;
	const contrast = resolved.options.contrast;
	const uiFontSize = resolved.options.ui_font_size;
	const pointerCursors = resolved.options.pointer_cursors;
	const translucentSidebar = resolved.options.translucent_sidebar;

	// Per-mode preset apply: only swaps the *colors* for the chosen
	// mode. Fonts are intentionally NOT touched here even though
	// presets carry a `fonts` field — `fonts` is a single global
	// record (one stack per slot, applied to both modes), so writing
	// a preset's fonts when the user picks a Light preset would
	// surface-replace the Dark UI's typography mid-session and vice
	// versa. The cross-mode font bleed was caught by
	// `frontend/e2e/preset-mode-isolation.spec.ts`. Users who want a
	// preset's typography can still get it by editing the Typography
	// rows directly, or by picking the same preset for both modes
	// (light + dark cards) — picking Cursor in *both* cards yields a
	// consistent intent that's safe to translate to global fonts in a
	// follow-up if we ever add a unified-preset surface.
	const applyLightPreset = useCallback(
		(preset: ThemePreset) => {
			updateAppearance(
				buildPayload(preset.light, overrides.dark, overrides.fonts, overrides.options)
			);
		},
		[overrides.dark, overrides.fonts, overrides.options, updateAppearance]
	);

	const applyDarkPreset = useCallback(
		(preset: ThemePreset) => {
			updateAppearance(
				buildPayload(overrides.light, preset.dark, overrides.fonts, overrides.options)
			);
		},
		[overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);

	return (
		<SettingsPage
			description="Customize colors, typography, and behavior. Pick a preset or fine-tune individual slots — your overrides apply across the entire app."
			title="Appearance"
		>
			<SettingsCard>
				<SettingsSectionHeader
					actions={
						<ThemeModeToggle
							onChange={(mode) => setOption('theme_mode', mode)}
							value={themeMode}
						/>
					}
					description="Use light, dark, or match your system. Light and dark themes can be picked from different presets independently."
					title="Theme"
				/>
			</SettingsCard>

			<ThemeColorCard
				defaults={DEFAULT_APPEARANCE.light}
				description="Palette applied when the active theme is light. Pick a preset or fine-tune any of the six semantic slots."
				heading="Light theme"
				mode="light"
				onPresetApply={applyLightPreset}
				onSlotCommit={setLightSlot}
				overrides={overrides.light}
				resolvedColors={resolved.light}
			/>
			<ThemeColorCard
				defaults={DEFAULT_APPEARANCE.dark}
				description="Palette applied when the active theme is dark. Pick a preset or fine-tune any of the six semantic slots."
				heading="Dark theme"
				mode="dark"
				onPresetApply={applyDarkPreset}
				onSlotCommit={setDarkSlot}
				overrides={overrides.dark}
				resolvedColors={resolved.dark}
			/>

			<TypographyCard
				onFontCommit={setFontSlot}
				onUiFontSize={(next) => setOption('ui_font_size', next)}
				overrides={overrides.fonts}
				uiFontSize={uiFontSize}
			/>

			<BehaviorCard
				contrast={contrast}
				onOptionChange={setOption}
				pointerCursors={pointerCursors}
				translucentSidebar={translucentSidebar}
			/>
		</SettingsPage>
	);
}
