/**
 * Whimsy customization — single self-contained module.
 *
 * Owns:
 * - {@link WhimsyConfig} type + localStorage persistence (via the project's
 *   shared `usePersistedState` hook).
 * - {@link useWhimsyTile} — generates a CSS `mask-image` URL from the current
 *   config, memoized on every config field that affects the SVG.
 * - {@link WhimsySettingsCard} — the controls dropped into Settings →
 *   Appearance.
 *
 * Designed to be removable with minimal blast radius. To rip out:
 * 1. Delete `frontend/features/whimsy/`.
 * 2. Revert the `useWhimsyTile()` call in `frontend/features/chat/ChatView.tsx`
 *    (or remove the texture overlay entirely).
 * 3. Remove the `<WhimsySettingsCard />` import + render from
 *    `frontend/features/settings/sections/AppearanceSection.tsx`.
 * 4. Optionally delete `frontend/lib/whimsy-tile.ts` and
 *    `frontend/app/dev/whimsy-tile/`.
 *
 * No new providers, no new contexts, no new query layers. Storage uses one
 * localStorage key (`whimsy:config`) and re-uses the existing settings
 * primitives.
 */

import { Shuffle } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectButton, type SelectButtonOption } from '@/components/ui/select-button';
import {
	SettingsCard,
	SettingsRow,
	SettingsSectionHeader,
	Slider,
	Switch,
} from '@/features/settings/primitives';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { cn } from '@/lib/utils';
import {
	isWhimsyPresetId,
	WHIMSY_PRESETS,
	type WhimsyPresetId,
	whimsyPresetUrl,
} from '@/lib/whimsy-presets';
import {
	generateWhimsyTile,
	svgToDataUri,
	WHIMSY_THEMES,
	type WhimsyThemeName,
} from '@/lib/whimsy-tile';

// ─────────────────────────────────────────────────────────────────────────────
// Storage / config
// ─────────────────────────────────────────────────────────────────────────────

/** localStorage key under which the whimsy customization is persisted. */
const WHIMSY_STORAGE_KEY = 'whimsy:config';

/**
 * Numeric bounds for sliders and validation. Centralizing keeps the slider min/max
 * in lockstep with the storage validator so a malicious or stale value can't slip
 * through one and fail the other.
 */
const WHIMSY_BOUNDS = {
	grid: { min: 3, max: 10 },
	size: { min: 120, max: 360 },
	/** Slider integer scale — internal 0-200 maps to opacity 0-0.20 (0%-20%). */
	opacityScale: { min: 0, max: 200 },
	/** Preset tile width in CSS pixels. Height auto-resolves from the SVG aspect. */
	presetSize: { min: 200, max: 1200 },
} as const;

/** Multiplier applied to the slider's integer value to get the stored decimal opacity. */
const OPACITY_SLIDER_DIVISOR = 1000;

/**
 * Selects between the procedural tile generator and a pre-laid-out SVG
 * preset. ``generated`` honours ``theme``/``seed``/``grid``; ``preset``
 * honours ``preset`` (a static SVG file under ``/whimsy-patterns/``) and
 * ignores the procedural knobs.
 */
export type WhimsyMode = 'generated' | 'preset';

/**
 * Tile / background colour override.
 *
 * - ``'theme'`` — derive from theme tokens (current behaviour). Tile uses
 *   ``currentColor`` (text-foreground); background stays the chat panel's
 *   underlying ``bg-background``.
 * - A ``'#rrggbb'`` string — apply that exact colour. Lets users dial in
 *   tints without waiting on a full gradient picker.
 */
export type WhimsyColor = 'theme' | string;

/** Validate a stored ``WhimsyColor`` value. */
function isWhimsyColor(value: unknown): value is WhimsyColor {
	if (value === 'theme') return true;
	return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** User-tunable parameters for the whimsy texture overlay. */
export interface WhimsyConfig {
	/** When false, the texture overlay is not rendered at all. */
	enabled: boolean;
	/** Source of the texture — procedurally generated tile or a static preset. */
	mode: WhimsyMode;
	/**
	 * Custom background colour painted under the texture. ``'theme'`` keeps
	 * the chat panel's underlying ``bg-background`` showing through; a hex
	 * string overrides it with a solid fill before the masked tile renders.
	 */
	backgroundColor: WhimsyColor;
	/**
	 * Custom tile tint. ``'theme'`` uses the foreground theme token (current
	 * behaviour); a hex string overrides the masked-tile colour.
	 */
	tintColor: WhimsyColor;
	/** Curated motif set name; one of {@link WHIMSY_THEMES}'s keys. Used in ``generated`` mode. */
	theme: WhimsyThemeName;
	/** Identifier of the active preset under ``/whimsy-patterns/``. Used in ``preset`` mode. */
	preset: WhimsyPresetId;
	/**
	 * Tile width in CSS pixels for ``preset`` mode. Height resolves from the
	 * SVG's intrinsic aspect via ``mask-size: <width>px auto``. Smaller =
	 * tighter repeats with smaller doodles; larger = bigger drawings, fewer
	 * repeats. Procedural ``size`` doesn't translate (different SVG aspect),
	 * so we keep this as its own field.
	 */
	presetSize: number;
	/** Deterministic placement seed. Any 32-bit integer; reroll for fresh layout. */
	seed: number;
	/** Motifs per row/column in the placement grid. Higher = denser pattern. */
	grid: number;
	/** Repeating tile dimension in CSS pixels. */
	size: number;
	/** Texture intensity. Stored as a 0..1 fraction; rendered via CSS `opacity`. */
	opacity: number;
}

/** Default config — matches the values originally hardcoded in `ChatView`. */
const DEFAULT_WHIMSY_CONFIG: WhimsyConfig = {
	enabled: true,
	mode: 'generated',
	backgroundColor: 'theme',
	tintColor: 'theme',
	theme: 'kawaii',
	preset: 'pattern-1',
	presetSize: 600,
	seed: 42,
	grid: 6,
	size: 240,
	opacity: 0.035,
};

const THEME_NAMES = Object.keys(WHIMSY_THEMES) as readonly WhimsyThemeName[];

/** Type guard for a string being one of the registered theme names. */
function isWhimsyThemeName(value: unknown): value is WhimsyThemeName {
	return typeof value === 'string' && THEME_NAMES.includes(value as WhimsyThemeName);
}

/**
 * Validates the on-disk shape. Rejects anything outside the slider bounds so a
 * stale persisted value (e.g. after we tighten a range) silently falls back to
 * the default instead of leaving the UI stuck on an invalid state. Pre-mode
 * persisted blobs (no ``mode`` / ``preset``) fail this guard; the
 * ``usePersistedState`` hook then replaces them with ``DEFAULT_WHIMSY_CONFIG``,
 * which is the safest one-shot migration since neither field had a meaningful
 * prior value.
 */
function validateWhimsyConfig(value: unknown): value is WhimsyConfig {
	if (!value || typeof value !== 'object') return false;
	const v = value as Partial<Record<keyof WhimsyConfig, unknown>>;
	return (
		typeof v.enabled === 'boolean' &&
		(v.mode === 'generated' || v.mode === 'preset') &&
		isWhimsyColor(v.backgroundColor) &&
		isWhimsyColor(v.tintColor) &&
		isWhimsyThemeName(v.theme) &&
		isWhimsyPresetId(v.preset) &&
		typeof v.presetSize === 'number' &&
		v.presetSize >= WHIMSY_BOUNDS.presetSize.min &&
		v.presetSize <= WHIMSY_BOUNDS.presetSize.max &&
		typeof v.seed === 'number' &&
		Number.isFinite(v.seed) &&
		typeof v.grid === 'number' &&
		v.grid >= WHIMSY_BOUNDS.grid.min &&
		v.grid <= WHIMSY_BOUNDS.grid.max &&
		typeof v.size === 'number' &&
		v.size >= WHIMSY_BOUNDS.size.min &&
		v.size <= WHIMSY_BOUNDS.size.max &&
		typeof v.opacity === 'number' &&
		v.opacity >= 0 &&
		v.opacity <= 1
	);
}

/**
 * Read/write hook for the whimsy customization. Backed by localStorage with
 * cross-tab sync via the shared {@link usePersistedState} primitive.
 *
 * @returns A `[config, setConfig]` tuple matching React's `useState` signature.
 */
export function useWhimsyConfig(): [WhimsyConfig, Dispatch<SetStateAction<WhimsyConfig>>] {
	return usePersistedState<WhimsyConfig>({
		storageKey: WHIMSY_STORAGE_KEY,
		defaultValue: DEFAULT_WHIMSY_CONFIG,
		validate: validateWhimsyConfig,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile-URL hook
// ─────────────────────────────────────────────────────────────────────────────

/** Result of {@link useWhimsyTile} — the inputs a consumer needs to render the overlay. */
export interface UseWhimsyTileResult {
	/**
	 * CSS `url("data:image/svg+xml,...")` value ready to drop into `mask-image`.
	 * `null` when the user has disabled the texture — consumers should skip
	 * rendering the overlay entirely in that case.
	 */
	cssUrl: string | null;
	/**
	 * Ready-to-drop ``mask-size`` value. In ``generated`` mode the source SVG
	 * is square so this is ``"<size>px <size>px"``. In ``preset`` mode the
	 * source SVGs are portrait (~1125×2436); we set the width and let the
	 * height resolve from the SVG's intrinsic aspect via ``auto`` so
	 * adjacent tiles meet edge-to-edge instead of leaving empty bands
	 * between repeats.
	 */
	maskSize: string;
	/**
	 * Custom background colour to paint under the masked tile. ``null`` means
	 * "use the parent's existing background"; a CSS colour string overrides.
	 */
	backgroundColor: string | null;
	/**
	 * CSS colour to use for the masked-tile fill. Either a hex string the
	 * user picked or ``"currentColor"`` when the config is ``"theme"`` —
	 * consumers can drop this directly into ``backgroundColor`` on the
	 * overlay element.
	 */
	tintColor: string;
	/** Stored opacity (0..1) — apply via CSS `opacity` on the overlay element. */
	opacity: number;
}

/**
 * Generates a tileable mask URL from the persisted whimsy config and memoizes
 * it on every input that affects the SVG. Cheap to call from any component;
 * regenerates only when the user changes a relevant setting.
 *
 * In ``preset`` mode the URL is a static asset under ``/whimsy-patterns/``
 * and the returned ``size`` is fixed at {@link PRESET_RENDER_SIZE} —
 * ignoring the user's ``size`` slider, which is meaningful only for the
 * procedural generator. In ``generated`` mode we build a tile in-memory and
 * inline it as a data URI (cheaper round-trip and lets the seed/density
 * knobs drive the SVG live).
 */
export function useWhimsyTile(): UseWhimsyTileResult {
	const [config] = useWhimsyConfig();
	const cssUrl = useMemo(() => {
		if (!config.enabled) return null;
		if (config.mode === 'preset') {
			return `url("${whimsyPresetUrl(config.preset)}")`;
		}
		const svg = generateWhimsyTile({
			size: config.size,
			seed: config.seed,
			grid: config.grid,
			motifs: WHIMSY_THEMES[config.theme],
		});
		return `url("${svgToDataUri(svg)}")`;
	}, [
		config.enabled,
		config.mode,
		config.preset,
		config.size,
		config.seed,
		config.grid,
		config.theme,
	]);
	const maskSize =
		config.mode === 'preset'
			? `${config.presetSize}px auto`
			: `${config.size}px ${config.size}px`;
	const backgroundColor = config.backgroundColor === 'theme' ? null : config.backgroundColor;
	const tintColor = config.tintColor === 'theme' ? 'currentColor' : config.tintColor;
	return { cssUrl, maskSize, backgroundColor, tintColor, opacity: config.opacity };
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings card
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable labels for the dropdown trigger and option list. */
const THEME_LABELS: Record<WhimsyThemeName, string> = {
	kawaii: 'Kawaii (everything)',
	cosmic: 'Cosmic (stars, moons)',
	botanical: 'Botanical (flowers, drops)',
	geometric: 'Geometric (diamonds, plus)',
	cute: 'Cute (hearts, flowers)',
	minimal: 'Minimal (dots, plus)',
	playful: 'Playful (Telegram-style)',
};

/** Static option list for the theme dropdown. */
const THEME_OPTIONS: readonly SelectButtonOption[] = THEME_NAMES.map((name) => ({
	id: name,
	label: THEME_LABELS[name],
	description: WHIMSY_THEMES[name].join(', '),
}));

const MODE_LABELS: Record<WhimsyMode, string> = {
	generated: 'Generated tile',
	preset: 'Preset pattern',
};

// PRESET_OPTIONS / PRESET_LABELS were removed when the preset picker switched
// from a dropdown to a thumbnail grid — clicking a thumbnail is faster than a
// "Pattern 1 / Pattern 2 / …" list, and there's no useful label for a tile.

/**
 * Default starter colour used when the user clicks the swatch while still on
 * ``"theme"``. Picked to be a neutral mid-tone so the first picker interaction
 * doesn't blast the panel with a vivid hue.
 */
const COLOR_PICKER_FALLBACK = '#cbd5e1';

interface WhimsyColorPickerProps {
	/** Current persisted value — either ``'theme'`` or a ``#rrggbb`` string. */
	value: WhimsyColor;
	/** Called with the new value when the user picks a colour or resets. */
	onChange: (next: WhimsyColor) => void;
}

/**
 * Compact swatch + native colour picker pair with a "Reset to theme" toggle.
 *
 * Uses the browser's native ``<input type="color">`` to keep the dependency
 * footprint zero — the platform widget is good enough for tints, and we can
 * upgrade to ``react-colorful`` later if/when we want HSL/alpha controls.
 */
function WhimsyColorPicker({ value, onChange }: WhimsyColorPickerProps): React.JSX.Element {
	// Native colour inputs require a hex value at all times — never ``undefined``
	// or a token string — so we feed the fallback when the persisted value is
	// ``'theme'``. The user picking a colour transitions the value off ``'theme'``.
	const hexValue = value === 'theme' ? COLOR_PICKER_FALLBACK : value;
	const isThemeDefault = value === 'theme';
	return (
		<div className="flex items-center gap-2">
			<label
				className="relative inline-flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-[6px] shadow-edge"
				style={{ backgroundColor: hexValue }}
			>
				<input
					aria-label="Pick colour"
					className="absolute inset-0 cursor-pointer opacity-0"
					onChange={(event) => onChange(event.target.value)}
					type="color"
					value={hexValue}
				/>
			</label>
			<span className="font-mono text-xs tabular-nums text-muted-foreground">
				{isThemeDefault ? 'theme' : hexValue}
			</span>
			{!isThemeDefault ? (
				<Button
					className="cursor-pointer"
					onClick={() => onChange('theme')}
					size="xs"
					type="button"
					variant="ghost"
				>
					Reset
				</Button>
			) : null}
		</div>
	);
}

/**
 * Settings → Appearance card for the whimsy texture. All controls write to the
 * same localStorage key consumed by {@link useWhimsyTile}, so changes propagate
 * to the chat panel live (and across tabs).
 */
export function WhimsySettingsCard(): React.JSX.Element {
	const [config, setConfig] = useWhimsyConfig();

	const reset = (): void => setConfig(DEFAULT_WHIMSY_CONFIG);
	// Keep the seed comfortably below 2^31 so it round-trips through any
	// integer arithmetic the generator's PRNG does.
	const randomizeSeed = (): void =>
		setConfig((prev) => ({ ...prev, seed: Math.floor(Math.random() * 1_000_000_000) }));

	// Slider stores integer 0-200 for fine control while the persisted opacity
	// stays a 0-0.20 decimal — matches how AppearanceSection's contrast slider
	// surfaces a percentage label without changing the persisted scale.
	const opacitySliderValue = Math.round(config.opacity * OPACITY_SLIDER_DIVISOR);

	return (
		<SettingsCard>
			<SettingsSectionHeader
				actions={
					<Button
						className="cursor-pointer"
						onClick={reset}
						size="xs"
						type="button"
						variant="ghost"
					>
						Reset
					</Button>
				}
				description="Decorative kawaii texture rendered behind the chat panel. Experimental — every control here is local to this browser."
				title="Whimsy texture"
			/>

			<SettingsRow description="Toggle the texture overlay on or off." label="Show texture">
				<Switch
					checked={config.enabled}
					onCheckedChange={(enabled) => setConfig((c) => ({ ...c, enabled }))}
				/>
			</SettingsRow>

			<SettingsRow
				description="Generated tiles are procedural and respond to the seed/density knobs below. Presets are hand-laid SVG wallpapers that ignore those knobs."
				label="Source"
			>
				{/*
				 * Two-button segmented toggle. With only two options a dropdown
				 * is more friction than the choice merits, and the segmented
				 * pattern surfaces the active mode without an extra click —
				 * which also sidesteps a regression where the SelectButton's
				 * onSelect didn't propagate the mode change reliably under
				 * StrictMode + persisted-state validation. Theme/Preset stay
				 * SelectButton-driven because they each have many options.
				 */}
				<div className="inline-flex rounded-[7px] bg-foreground/[0.04] p-0.5 text-xs font-medium">
					{(['generated', 'preset'] as const).map((mode) => {
						const isActive = config.mode === mode;
						return (
							<button
								aria-pressed={isActive}
								className={cn(
									'cursor-pointer rounded-[6px] px-3 py-1 transition-colors duration-150 ease-out',
									isActive
										? 'bg-background text-foreground shadow-thin'
										: 'text-muted-foreground hover:text-foreground'
								)}
								key={mode}
								onClick={() => setConfig((c) => ({ ...c, mode }))}
								type="button"
							>
								{MODE_LABELS[mode]}
							</button>
						);
					})}
				</div>
			</SettingsRow>

			{config.mode === 'preset' ? (
				<>
					<SettingsRow
						description="Tile width in CSS pixels. Smaller = denser, larger = bigger doodles with fewer repeats. Height auto-resolves from the source SVG aspect."
						label="Tile scale"
					>
						<div className="flex w-56 items-center gap-3">
							<Slider
								max={WHIMSY_BOUNDS.presetSize.max}
								min={WHIMSY_BOUNDS.presetSize.min}
								onValueChange={(values) => {
									const next = values[0];
									if (typeof next === 'number')
										setConfig((c) => ({ ...c, presetSize: next }));
								}}
								step={20}
								value={[config.presetSize]}
							/>
							<span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
								{config.presetSize}px
							</span>
						</div>
					</SettingsRow>
					<SettingsRow
						className="items-start"
						description="Pick from the bundled SVG patterns. Theme/seed/density are ignored in this mode. Click a thumbnail to apply it instantly."
						label="Preset"
					>
						{/*
						 * Thumbnail grid instead of a dropdown. With 33 unlabelled
						 * "Pattern N" options the dropdown was useless even if it
						 * worked — patterns differ visually, not by name. Also
						 * sidesteps the SelectButton/dropdown bug tracked in the
						 * companion bean.
						 */}
						<div className="grid w-72 grid-cols-4 gap-1.5">
							{WHIMSY_PRESETS.map((preset) => {
								const isActive = config.preset === preset.id;
								return (
									<button
										aria-label={preset.label}
										aria-pressed={isActive}
										className={cn(
											'group relative aspect-square cursor-pointer overflow-hidden rounded-[6px] bg-foreground/[0.04] transition-shadow duration-150',
											'hover:bg-foreground/[0.08]',
											isActive && 'shadow-[0_0_0_2px_var(--color-accent)]'
										)}
										key={preset.id}
										onClick={() =>
											setConfig((c) => ({ ...c, preset: preset.id }))
										}
										type="button"
									>
										<span
											aria-hidden="true"
											className="absolute inset-0 text-foreground/40"
											style={{
												backgroundColor: 'currentColor',
												maskImage: `url("${whimsyPresetUrl(preset.id)}")`,
												WebkitMaskImage: `url("${whimsyPresetUrl(preset.id)}")`,
												// Each thumbnail shows ~one tile of the
												// pattern; auto height keeps the source
												// SVG's portrait aspect, so adjacent
												// thumbnails read as the same family.
												maskSize: '64px auto',
												WebkitMaskSize: '64px auto',
												maskRepeat: 'repeat',
												WebkitMaskRepeat: 'repeat',
											}}
										/>
									</button>
								);
							})}
						</div>
					</SettingsRow>
				</>
			) : (
				<SettingsRow
					description="Restricts which motifs the generator can pick from. Pick a curated combo."
					label="Theme"
				>
					<SelectButton
						activeId={config.theme}
						ariaLabel="Whimsy theme"
						onSelect={(id) => {
							if (isWhimsyThemeName(id)) setConfig((c) => ({ ...c, theme: id }));
						}}
						options={THEME_OPTIONS}
						triggerLabel={THEME_LABELS[config.theme]}
					/>
				</SettingsRow>
			)}

			{config.mode === 'generated' ? (
				<>
					<SettingsRow
						description="Layout randomness. Same seed always renders the same tile; reroll for a new scatter."
						label="Seed"
					>
						<div className="flex items-center gap-2">
							<Input
								aria-label="Whimsy seed"
								className="w-28 text-right text-sm tabular-nums"
								onChange={(event) => {
									const next = Number.parseInt(event.target.value, 10);
									if (Number.isFinite(next))
										setConfig((c) => ({ ...c, seed: next }));
								}}
								type="number"
								value={config.seed}
							/>
							<Button
								aria-label="Randomize seed"
								className="cursor-pointer"
								onClick={randomizeSeed}
								size="icon-xs"
								type="button"
								variant="ghost"
							>
								<Shuffle aria-hidden="true" />
							</Button>
						</div>
					</SettingsRow>

					<SettingsRow
						description="Motifs per row/column inside one tile. Higher = denser pattern."
						label="Density"
					>
						<div className="flex w-56 items-center gap-3">
							<Slider
								max={WHIMSY_BOUNDS.grid.max}
								min={WHIMSY_BOUNDS.grid.min}
								onValueChange={(values) => {
									const next = values[0];
									if (typeof next === 'number')
										setConfig((c) => ({ ...c, grid: next }));
								}}
								step={1}
								value={[config.grid]}
							/>
							<span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
								{config.grid}×{config.grid}
							</span>
						</div>
					</SettingsRow>
				</>
			) : null}

			{config.mode === 'generated' ? (
				<SettingsRow
					description="Pixels per repeating tile. Smaller tiles repeat more often, so motifs feel denser without changing the grid."
					label="Tile size"
				>
					<div className="flex w-56 items-center gap-3">
						<Slider
							max={WHIMSY_BOUNDS.size.max}
							min={WHIMSY_BOUNDS.size.min}
							onValueChange={(values) => {
								const next = values[0];
								if (typeof next === 'number')
									setConfig((c) => ({ ...c, size: next }));
							}}
							step={20}
							value={[config.size]}
						/>
						<span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
							{config.size}px
						</span>
					</div>
				</SettingsRow>
			) : null}

			<SettingsRow
				description="Solid colour painted under the texture. Click the swatch to pick; reset switches back to the theme background."
				label="Background colour"
			>
				<WhimsyColorPicker
					value={config.backgroundColor}
					onChange={(next) => setConfig((c) => ({ ...c, backgroundColor: next }))}
				/>
			</SettingsRow>

			<SettingsRow
				description="Tile (mask) colour. Click the swatch to override the theme's foreground colour for the doodles."
				label="Tile tint"
			>
				<WhimsyColorPicker
					value={config.tintColor}
					onChange={(next) => setConfig((c) => ({ ...c, tintColor: next }))}
				/>
			</SettingsRow>

			<SettingsRow
				description="How visible the texture is over the chat panel. The default is 3.5%."
				label="Opacity"
			>
				<div className="flex w-56 items-center gap-3">
					<Slider
						max={WHIMSY_BOUNDS.opacityScale.max}
						min={WHIMSY_BOUNDS.opacityScale.min}
						onValueChange={(values) => {
							const next = values[0];
							if (typeof next === 'number') {
								setConfig((c) => ({
									...c,
									opacity: next / OPACITY_SLIDER_DIVISOR,
								}));
							}
						}}
						step={5}
						value={[opacitySliderValue]}
					/>
					<span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
						{(config.opacity * 100).toFixed(1)}%
					</span>
				</div>
			</SettingsRow>
		</SettingsCard>
	);
}
