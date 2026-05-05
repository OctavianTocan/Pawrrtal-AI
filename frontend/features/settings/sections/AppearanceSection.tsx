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
 * `frontend/features/appearance/defaults.ts`; "Reset to defaults"
 * deletes the persisted row server-side so the user falls all the way
 * back to those values.
 */

import { LaptopMinimal, Moon, Sun } from 'lucide-react';
import {
	type ChangeEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Input } from '@/components/ui/input';
import {
	type AppearanceFonts,
	type AppearanceOptions,
	type AppearanceSettings,
	COLOR_SLOTS,
	type ColorSlot,
	DEFAULT_APPEARANCE,
	FONT_SLOTS,
	type FontSlot,
	resolveAppearance,
	THEME_PRESETS,
	type ThemeColors,
	type ThemeMode,
	useAppearance,
	useUpdateAppearance,
} from '@/features/appearance';
import { cn } from '@/lib/utils';
import { SettingsCard, SettingsRow, Slider, Switch } from '../primitives';

/** Debounce window for color hex / font family inputs. Tuned to feel
 *  responsive (under the Doherty 400ms threshold) while not flooding
 *  the API with one PUT per keystroke. */
const TEXT_INPUT_DEBOUNCE_MS = 250;

/**
 * Resolve any CSS color string (hex, rgb, oklch, named) into a `#rrggbb`
 * literal that `<input type="color">` accepts. Uses an offscreen canvas
 * because the native input doesn't speak `oklch()`. Returns the input
 * unchanged when it's already 7-char hex (fast path).
 *
 * Falls back to a sensible default (`#888888`) on SSR or if the runtime
 * can't parse the string — the picker still shows *something* the user
 * can drag, and the typed input retains the original value untouched.
 */
function toHex(value: string | undefined | null): string {
	if (!value) return '#888888';
	const trimmed = value.trim();
	if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
	if (typeof document === 'undefined') return '#888888';
	const ctx = document.createElement('canvas').getContext('2d');
	if (!ctx) return '#888888';
	try {
		ctx.fillStyle = '#000';
		ctx.fillStyle = trimmed;
		const computed = ctx.fillStyle;
		if (typeof computed === 'string' && /^#[0-9a-f]{6}$/i.test(computed)) {
			return computed.toLowerCase();
		}
	} catch {
		/* fall through */
	}
	return '#888888';
}

/** Human-readable labels for each color slot, shown next to the swatch. */
const COLOR_LABELS: Record<ColorSlot, string> = {
	background: 'Background',
	foreground: 'Foreground',
	accent: 'Accent',
	info: 'Info',
	success: 'Success',
	destructive: 'Destructive',
};

/** Human-readable labels for each font slot. */
const FONT_LABELS: Record<FontSlot, string> = {
	display: 'Display font',
	sans: 'UI font',
	mono: 'Code font',
};

/** Theme mode options shown in the top-of-card switcher. */
const THEME_MODE_OPTIONS = [
	{ id: 'light', label: 'Light', Icon: Sun },
	{ id: 'dark', label: 'Dark', Icon: Moon },
	{ id: 'system', label: 'System', Icon: LaptopMinimal },
] as const satisfies ReadonlyArray<{ id: ThemeMode; label: string; Icon: typeof Sun }>;

/**
 * Compose a full `AppearanceSettings` payload from the four sub-records.
 * Centralized so every mutation path uses the exact same shape.
 */
function buildPayload(
	light: ThemeColors,
	dark: ThemeColors,
	fonts: AppearanceFonts,
	options: AppearanceOptions
): AppearanceSettings {
	return { light, dark, fonts, options };
}

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
			className="flex items-center gap-1 rounded-[8px] border border-foreground/10 bg-foreground/[0.03] p-0.5"
			role="toolbar"
		>
			{THEME_MODE_OPTIONS.map((option) => {
				const isActive = value === option.id;
				return (
					<button
						aria-pressed={isActive}
						className={cn(
							'flex cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs',
							'transition-colors duration-150 ease-out',
							isActive
								? 'bg-foreground/10 text-foreground'
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

/**
 * A single colored swatch + value input row.
 *
 * Holds local draft state so typing into the field doesn't lag — a
 * debounced commit fires `onCommit` once the user stops typing. The
 * placeholder always shows the *default* value for that slot so
 * resetting an override is as simple as clearing the field. Tabular
 * nums on the value field keep aligned columns when the user types
 * hex codes that mix digits + letters.
 */
function ColorRow({
	label,
	resolvedValue,
	overrideValue,
	defaultValue,
	onCommit,
}: {
	label: string;
	resolvedValue: string;
	overrideValue: string | null | undefined;
	defaultValue: string;
	onCommit: (next: string | null) => void;
}): React.JSX.Element {
	const [draft, setDraft] = useState(overrideValue ?? '');
	const draftRef = useRef(draft);
	const commitRef = useRef(onCommit);

	// Keep refs current so the debounced timeout reads the latest
	// values without re-creating the timer (per `react/state-safety`
	// rule on stale closures inside debounced callbacks).
	useEffect(() => {
		draftRef.current = draft;
	}, [draft]);
	useEffect(() => {
		commitRef.current = onCommit;
	}, [onCommit]);

	// External `overrideValue` changes (e.g. reset to defaults from a
	// different surface) reset the local draft so the field doesn't
	// show stale text after a server-side wipe.
	useEffect(() => {
		setDraft(overrideValue ?? '');
	}, [overrideValue]);

	useEffect(() => {
		if (draft === (overrideValue ?? '')) return;
		const handle = setTimeout(() => {
			const next = draftRef.current.trim();
			commitRef.current(next.length === 0 ? null : next);
		}, TEXT_INPUT_DEBOUNCE_MS);
		return () => clearTimeout(handle);
	}, [draft, overrideValue]);

	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setDraft(event.target.value);
	}, []);

	const pickerValue = toHex(draft || resolvedValue);

	const handlePickerChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		// The native picker emits `#rrggbb` instantly per drag pixel;
		// commit immediately (no debounce) because every change is a
		// fully-formed value, and skipping debounce gives the user the
		// "live preview while dragging" feel of Mistral / Raycast.
		const next = event.target.value;
		setDraft(next);
		commitRef.current(next);
	}, []);

	return (
		<SettingsRow label={label}>
			<div className="flex items-center gap-2 rounded-[6px] border border-foreground/10 bg-foreground/[0.03] px-1.5 py-1">
				{/* Native color picker — clicking the swatch opens the OS dialog;
				 *  dragging inside it commits per-pixel without debounce so the
				 *  preview is live. The label-wrap makes the entire swatch the
				 *  click target (Fitts's Law) without an extra DOM node. */}
				<label
					aria-label={`${label} color picker`}
					className="relative flex size-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-foreground/15"
					style={{ backgroundColor: resolvedValue }}
				>
					<input
						className="absolute inset-0 size-full cursor-pointer opacity-0"
						onChange={handlePickerChange}
						type="color"
						value={pickerValue}
					/>
				</label>
				<input
					aria-label={`${label} color value`}
					className="w-40 bg-transparent font-mono text-xs tabular-nums outline-none placeholder:text-muted-foreground/70"
					onChange={handleChange}
					placeholder={defaultValue}
					value={draft}
				/>
			</div>
		</SettingsRow>
	);
}

/** Single font-family input row with the same debounce + placeholder behavior. */
function FontRow({
	label,
	overrideValue,
	defaultValue,
	onCommit,
}: {
	label: string;
	overrideValue: string | null | undefined;
	defaultValue: string;
	onCommit: (next: string | null) => void;
}): React.JSX.Element {
	const [draft, setDraft] = useState(overrideValue ?? '');
	const draftRef = useRef(draft);
	const commitRef = useRef(onCommit);

	useEffect(() => {
		draftRef.current = draft;
	}, [draft]);
	useEffect(() => {
		commitRef.current = onCommit;
	}, [onCommit]);
	useEffect(() => {
		setDraft(overrideValue ?? '');
	}, [overrideValue]);

	useEffect(() => {
		if (draft === (overrideValue ?? '')) return;
		const handle = setTimeout(() => {
			const next = draftRef.current.trim();
			commitRef.current(next.length === 0 ? null : next);
		}, TEXT_INPUT_DEBOUNCE_MS);
		return () => clearTimeout(handle);
	}, [draft, overrideValue]);

	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setDraft(event.target.value);
	}, []);

	return (
		<SettingsRow label={label}>
			<Input
				aria-label={`${label} family`}
				className="w-72 text-xs"
				onChange={handleChange}
				placeholder={defaultValue}
				value={draft}
			/>
		</SettingsRow>
	);
}

interface ThemeColorCardProps {
	heading: string;
	overrides: ThemeColors;
	resolvedColors: Record<ColorSlot, string>;
	defaults: Record<ColorSlot, string>;
	onSlotCommit: (slot: ColorSlot, next: string | null) => void;
	onPresetSelect: (presetId: string) => void;
	onResetMode: () => void;
	footer?: ReactNode;
}

/** Sentinel ids the preset dropdown ships with. Real presets get their
 *  own slug-based ids from `themes:build`. */
const PRESET_RESET_VALUE = '__reset__';
const PRESET_PLACEHOLDER_VALUE = '__placeholder__';

/** Renders one of the two themed cards (Light / Dark) with its 6 color
 *  rows + a `<select>` to apply a preset (or reset all six slots). */
function ThemeColorCard({
	heading,
	overrides,
	resolvedColors,
	defaults,
	onSlotCommit,
	onPresetSelect,
	onResetMode,
	footer,
}: ThemeColorCardProps): React.JSX.Element {
	const handleSelectChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			const next = event.target.value;
			if (next === PRESET_PLACEHOLDER_VALUE) return;
			if (next === PRESET_RESET_VALUE) {
				onResetMode();
				return;
			}
			onPresetSelect(next);
		},
		[onPresetSelect, onResetMode]
	);

	return (
		<SettingsCard>
			<header className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2">
				<span className="text-sm font-semibold text-foreground">{heading}</span>
				<div className="relative">
					{/* Native <select> — keyboard-friendly, themable via the
					 *  cascade, and the OS-native picker UI. The visible
					 *  text shows the active preset id; the selected option
					 *  resets to the placeholder after each apply so the
					 *  user can re-apply the same preset to wipe edits. */}
					<select
						aria-label={`${heading} preset`}
						className={cn(
							'cursor-pointer appearance-none rounded-[6px] border border-foreground/10 bg-foreground/[0.03] py-1 pr-7 pl-2 text-xs text-foreground',
							'transition-colors duration-150 ease-out hover:border-foreground/20 hover:bg-foreground/[0.05]',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
						)}
						defaultValue={PRESET_PLACEHOLDER_VALUE}
						onChange={handleSelectChange}
					>
						<option value={PRESET_PLACEHOLDER_VALUE}>Apply preset…</option>
						{THEME_PRESETS.map((preset) => (
							<option key={preset.id} value={preset.id}>
								{preset.name}
							</option>
						))}
						<option value={PRESET_RESET_VALUE}>Reset to defaults</option>
					</select>
					<span
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted-foreground"
					>
						▾
					</span>
				</div>
			</header>
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
	// CSS variables agree on what's "active". `data` may be `undefined`
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

	const applyPresetByIdToMode = useCallback(
		(mode: 'light' | 'dark', presetId: string) => {
			const preset = THEME_PRESETS.find((entry) => entry.id === presetId);
			if (!preset) return;
			if (mode === 'light') {
				const nextLight: ThemeColors = { ...overrides.light, ...preset.colors };
				const nextFonts: AppearanceFonts = { ...overrides.fonts, ...preset.fonts };
				updateAppearance(
					buildPayload(nextLight, overrides.dark, nextFonts, overrides.options)
				);
			} else {
				const nextDark: ThemeColors = { ...overrides.dark, ...preset.colors };
				const nextFonts: AppearanceFonts = { ...overrides.fonts, ...preset.fonts };
				updateAppearance(
					buildPayload(overrides.light, nextDark, nextFonts, overrides.options)
				);
			}
		},
		[overrides.dark, overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);

	const resetMode = useCallback(
		(mode: 'light' | 'dark') => {
			const nextLight: ThemeColors = mode === 'light' ? {} : overrides.light;
			const nextDark: ThemeColors = mode === 'dark' ? {} : overrides.dark;
			updateAppearance(buildPayload(nextLight, nextDark, overrides.fonts, overrides.options));
		},
		[overrides.dark, overrides.fonts, overrides.light, overrides.options, updateAppearance]
	);

	return (
		<div className="flex flex-col gap-6">
			<SettingsCard>
				<header className="flex items-center justify-between border-b border-foreground/5 pb-2">
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-foreground">Theme</span>
						<span className="text-xs text-muted-foreground">
							Use light, dark, or match your system. Defaults to the AI Nexus sunset
							palette.
						</span>
					</div>
					<ThemeModeToggle
						onChange={(mode) => setOption('theme_mode', mode)}
						value={themeMode}
					/>
				</header>
			</SettingsCard>

			<ThemeColorCard
				defaults={DEFAULT_APPEARANCE.light}
				heading="Light theme"
				onPresetSelect={(id) => applyPresetByIdToMode('light', id)}
				onResetMode={() => resetMode('light')}
				onSlotCommit={setLightSlot}
				overrides={overrides.light}
				resolvedColors={resolved.light}
			/>
			<ThemeColorCard
				defaults={DEFAULT_APPEARANCE.dark}
				heading="Dark theme"
				onPresetSelect={(id) => applyPresetByIdToMode('dark', id)}
				onResetMode={() => resetMode('dark')}
				onSlotCommit={setDarkSlot}
				overrides={overrides.dark}
				resolvedColors={resolved.dark}
			/>

			<SettingsCard>
				<header className="flex items-center justify-between border-b border-foreground/5 pb-2">
					<span className="text-sm font-semibold text-foreground">Typography</span>
				</header>
				{FONT_SLOTS.map((slot) => (
					<FontRow
						defaultValue={DEFAULT_APPEARANCE.fonts[slot]}
						key={slot}
						label={FONT_LABELS[slot]}
						onCommit={(next) => setFontSlot(slot, next)}
						overrideValue={overrides.fonts[slot]}
					/>
				))}
				<SettingsRow
					description="Adjust the base size used for the AI Nexus UI. Drives every rem-denominated value."
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
								if (Number.isFinite(next)) setOption('ui_font_size', next);
							}}
							type="number"
							value={uiFontSize}
						/>
						<span className="text-xs text-muted-foreground">px</span>
					</div>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard>
				<header className="flex items-center justify-between border-b border-foreground/5 pb-2">
					<span className="text-sm font-semibold text-foreground">Behavior</span>
				</header>
				<SettingsRow
					description="Change the cursor to a pointer when hovering over interactive elements"
					label="Use pointer cursors"
				>
					<Switch
						checked={pointerCursors}
						onCheckedChange={(checked) => setOption('pointer_cursors', checked)}
					/>
				</SettingsRow>
				<SettingsRow
					description="Use a glass-style backdrop on the sidebar when scenic mode is enabled"
					label="Translucent sidebar"
				>
					<Switch
						checked={translucentSidebar}
						onCheckedChange={(checked) => setOption('translucent_sidebar', checked)}
					/>
				</SettingsRow>
				<SettingsRow label="Contrast">
					<div className="flex w-56 items-center gap-3">
						<Slider
							max={100}
							min={0}
							onValueChange={(values) => {
								const next = values[0];
								if (typeof next === 'number') setOption('contrast', next);
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
		</div>
	);
}
