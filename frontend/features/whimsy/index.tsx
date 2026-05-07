'use client';

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

/** User-tunable parameters for the whimsy texture overlay. */
export interface WhimsyConfig {
	/** When false, the texture overlay is not rendered at all. */
	enabled: boolean;
	/** Source of the texture — procedurally generated tile or a static preset. */
	mode: WhimsyMode;
	/** Curated motif set name; one of {@link WHIMSY_THEMES}'s keys. Used in ``generated`` mode. */
	theme: WhimsyThemeName;
	/** Identifier of the active preset under ``/whimsy-patterns/``. Used in ``preset`` mode. */
	preset: WhimsyPresetId;
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
	theme: 'kawaii',
	preset: 'pattern-1',
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
		isWhimsyThemeName(v.theme) &&
		isWhimsyPresetId(v.preset) &&
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
	/** Tile dimension in pixels — pair with `mask-size`. */
	size: number;
	/** Stored opacity (0..1) — apply via CSS `opacity` on the overlay element. */
	opacity: number;
}

/**
 * Tile size used for ``preset`` mode. The packaged SVGs are sized for a phone
 * screen (~1125 px wide); rendering them at the user's procedural ``size``
 * (120-360 px) shrinks the doodles into illegibility. 600 px is large enough
 * to read individual drawings on a desktop chat panel, small enough that two
 * to three repeats are visible across the panel width.
 */
const PRESET_RENDER_SIZE = 600;

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
	const size = config.mode === 'preset' ? PRESET_RENDER_SIZE : config.size;
	return { cssUrl, size, opacity: config.opacity };
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

/** Mode switcher option list — generated tile vs static preset. */
const MODE_OPTIONS: readonly SelectButtonOption[] = [
	{
		id: 'generated',
		label: 'Generated tile',
		description: 'Procedural pattern from a curated motif set. Reroll with the seed.',
	},
	{
		id: 'preset',
		label: 'Preset pattern',
		description: 'Hand-laid SVG wallpaper. Curated, no procedural knobs.',
	},
];

const MODE_LABELS: Record<WhimsyMode, string> = {
	generated: 'Generated tile',
	preset: 'Preset pattern',
};

/** Static option list for the preset dropdown — one entry per packaged SVG. */
const PRESET_OPTIONS: readonly SelectButtonOption[] = WHIMSY_PRESETS.map((preset) => ({
	id: preset.id,
	label: preset.label,
}));

const PRESET_LABELS: Record<WhimsyPresetId, string> = WHIMSY_PRESETS.reduce<
	Record<WhimsyPresetId, string>
>(
	(acc, preset) => {
		acc[preset.id] = preset.label;
		return acc;
	},
	{} as Record<WhimsyPresetId, string>
);

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
				<SelectButton
					activeId={config.mode}
					ariaLabel="Whimsy mode"
					onSelect={(id) => {
						if (id === 'generated' || id === 'preset') {
							setConfig((c) => ({ ...c, mode: id }));
						}
					}}
					options={MODE_OPTIONS}
					triggerLabel={MODE_LABELS[config.mode]}
				/>
			</SettingsRow>

			{config.mode === 'preset' ? (
				<SettingsRow
					description="Pick from the bundled SVG patterns. Theme/seed/density are ignored in this mode."
					label="Preset"
				>
					<SelectButton
						activeId={config.preset}
						ariaLabel="Whimsy preset"
						onSelect={(id) => {
							if (isWhimsyPresetId(id)) setConfig((c) => ({ ...c, preset: id }));
						}}
						options={PRESET_OPTIONS}
						triggerLabel={PRESET_LABELS[config.preset]}
					/>
				</SettingsRow>
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
