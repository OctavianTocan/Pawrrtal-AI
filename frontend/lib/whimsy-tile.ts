/**
 * Generates seamlessly-tiling kawaii SVG patterns for use as a CSS `mask-image`.
 *
 * The output SVG is a single tile that, when repeated, has no visible seams.
 * This is achieved by toroidal wrap-around: any motif whose bounding circle
 * crosses a tile edge is also rendered on the opposite edge so the halves
 * line up when adjacent tiles are placed side by side.
 *
 * The SVG contains shape data only (no colors). The intended use is as a CSS
 * mask layer over a `background-color`, so the rendered color is driven by
 * design tokens and adapts to light/dark themes for free.
 *
 * # Generating different patterns
 *
 * The generator produces a different pattern for every combination of three
 * inputs. Counts are conceptually unbounded — pick a seed and you get a fresh
 * layout — so think in terms of axes of variation rather than discrete sets:
 *
 * 1. **Seed** (`seed`, integer) — controls placement, rotation, scale jitter,
 *    and which motif lands in each grid cell. Effectively unlimited; any
 *    integer produces a deterministic, repeatable layout.
 * 2. **Density** (`grid`, integer 3..10) — number of motifs per row/column.
 *    Sparse (4 = 16 motifs), default (6 = 36), dense (7 = 49), claustrophobic
 *    (8 = 64). Higher densities work better at small tile sizes.
 * 3. **Motif set** (`motifs`, optional array of {@link MotifId}) — restricts
 *    which shapes can appear. Use {@link WHIMSY_THEMES} for curated combos
 *    (cosmic, botanical, geometric, ...) or pass any custom subset.
 *
 * ## Examples
 *
 * Default kawaii mix at default size and density:
 *
 * ```ts
 * const svg = generateWhimsyTile();
 * const url = `url("${svgToDataUri(svg)}")`;
 * ```
 *
 * Using a curated theme:
 *
 * ```ts
 * const cosmic = generateWhimsyTile({
 *   seed: 7,
 *   grid: 5,
 *   motifs: WHIMSY_THEMES.cosmic, // stars, sparkles, moons, dots
 * });
 * ```
 *
 * Custom motif subset (just hearts and dots, very dense):
 *
 * ```ts
 * const heartfield = generateWhimsyTile({
 *   seed: 99,
 *   grid: 7,
 *   motifs: ['heart', 'dot'],
 * });
 * ```
 *
 * Browsing variants — change the seed to roll a new layout. To produce a
 * non-deterministic tile per page load, pass `Math.random() * 1e9 | 0` as
 * the seed. For SSR/CSR consistency, keep the seed stable.
 */

/**
 * A single kawaii motif drawn centered at (0, 0) in SVG user units.
 *
 * `radius` is the approximate bounding-circle radius before scale is applied;
 * it is used to decide which edges a placement crosses for toroidal wrapping.
 * `shape` is one or more SVG fragments (`<path>`, `<circle>`, ...) with no
 * explicit fill attribute — fill is set on the parent `<g>`.
 */
interface Motif {
	readonly id: string;
	readonly radius: number;
	readonly shape: string;
}

/** Default tile dimension in SVG user units. */
const DEFAULT_TILE_SIZE = 240;
/** Default placement grid resolution (motifs per row and column). */
const DEFAULT_GRID = 6;
/** Default lower bound for per-motif scale jitter. */
const DEFAULT_SCALE_MIN = 0.7;
/** Default upper bound for per-motif scale jitter. */
const DEFAULT_SCALE_MAX = 1.35;
/** Default deterministic seed when none is provided. */
const DEFAULT_SEED = 42;

/**
 * Kawaii motif library. Coordinates are in SVG user units, centered on (0, 0).
 * Designed so each shape reads clearly at sizes between roughly 6px and 14px.
 *
 * Declared with `as const satisfies readonly Motif[]` so the literal `id`
 * values flow into the {@link MotifId} union below.
 */
const KAWAII_MOTIFS = [
	{
		id: 'heart',
		radius: 6,
		shape: '<path d="M0,-2 C-2,-5 -6,-5 -6,-2 C-6,1 0,5 0,5 C0,5 6,1 6,-2 C6,-5 2,-5 0,-2 Z"/>',
	},
	{
		id: 'star',
		radius: 6,
		shape: '<path d="M0,-6 L1.76,-1.85 L6,-1.85 L2.62,0.71 L3.71,4.85 L0,2.4 L-3.71,4.85 L-2.62,0.71 L-6,-1.85 L-1.76,-1.85 Z"/>',
	},
	{
		id: 'sparkle',
		radius: 6,
		shape: '<path d="M0,-6 Q1,-1 6,0 Q1,1 0,6 Q-1,1 -6,0 Q-1,-1 0,-6 Z"/>',
	},
	{
		id: 'plus',
		radius: 5,
		shape: '<path d="M-1.5,-5 L1.5,-5 L1.5,-1.5 L5,-1.5 L5,1.5 L1.5,1.5 L1.5,5 L-1.5,5 L-1.5,1.5 L-5,1.5 L-5,-1.5 L-1.5,-1.5 Z"/>',
	},
	{
		id: 'diamond',
		radius: 5,
		shape: '<path d="M0,-5 L5,0 L0,5 L-5,0 Z"/>',
	},
	{
		id: 'triangle',
		radius: 5,
		shape: '<path d="M0,-5 L4.33,2.5 L-4.33,2.5 Z"/>',
	},
	{
		id: 'moon',
		radius: 5,
		shape: '<path d="M3,-5 A5,5 0 1 0 3,5 Q-2,0 3,-5 Z"/>',
	},
	{
		id: 'flower',
		radius: 5,
		shape: '<circle cx="0" cy="-3" r="1.5"/><circle cx="2.85" cy="-0.93" r="1.5"/><circle cx="1.76" cy="2.43" r="1.5"/><circle cx="-1.76" cy="2.43" r="1.5"/><circle cx="-2.85" cy="-0.93" r="1.5"/><circle cx="0" cy="0" r="1.5"/>',
	},
	{
		id: 'dot',
		radius: 1.5,
		shape: '<circle cx="0" cy="0" r="1.5"/>',
	},
	{
		id: 'teardrop',
		radius: 4,
		shape: '<path d="M0,-4 Q3,-1 0,4 Q-3,-1 0,-4 Z"/>',
	},
] as const satisfies readonly Motif[];

/**
 * Union of every motif id available in the generator.
 *
 * Derived from {@link KAWAII_MOTIFS} via `as const`, so adding a new motif to
 * the array automatically widens this type — no manual list to keep in sync.
 */
export type MotifId = (typeof KAWAII_MOTIFS)[number]['id'];

/**
 * Curated motif combinations. Pass one of these as the `motifs` option to
 * restrict the generator to a coherent visual register.
 *
 * To add a new theme, append a new key here. The values are typed against
 * {@link MotifId} via `satisfies`, so misspelled motif ids fail at compile
 * time and autocomplete works on the names.
 *
 * @example
 * ```ts
 * const url = `url("${svgToDataUri(generateWhimsyTile({
 *   motifs: WHIMSY_THEMES.cosmic,
 *   seed: 7,
 * }))}")`;
 * ```
 */
export const WHIMSY_THEMES = {
	/** Default mix — every motif in the library. Reads as soft, generic kawaii. */
	kawaii: [
		'heart',
		'star',
		'sparkle',
		'plus',
		'diamond',
		'triangle',
		'moon',
		'flower',
		'dot',
		'teardrop',
	],
	/** Stars, sparkles, crescents, dots. Night-sky / dream surface vibe. */
	cosmic: ['star', 'sparkle', 'moon', 'dot'],
	/** Flowers, teardrops, hearts, dots. Soft, organic, garden-like. */
	botanical: ['flower', 'teardrop', 'heart', 'dot'],
	/** Diamonds, triangles, plus signs, dots. Cool, structured, modernist. */
	geometric: ['diamond', 'triangle', 'plus', 'dot'],
	/** Hearts, flowers, stars, sparkles, dots. Maximum sweet — no neutrals. */
	cute: ['heart', 'flower', 'star', 'sparkle', 'dot'],
	/** Dots, plus signs, sparkles. Quiet ambient texture, almost noise. */
	minimal: ['dot', 'plus', 'sparkle'],
	/** Hearts, stars, sparkles, plus signs, diamonds, dots. Telegram-leaning. */
	playful: ['heart', 'star', 'sparkle', 'plus', 'diamond', 'dot'],
} as const satisfies Record<string, readonly MotifId[]>;

/** Names of the {@link WHIMSY_THEMES} presets. */
export type WhimsyThemeName = keyof typeof WHIMSY_THEMES;

/**
 * Mulberry32 pseudo-random number generator. Deterministic given the same seed,
 * which lets us regenerate identical tiles across server and client renders.
 *
 * @param seed - 32-bit integer seed.
 * @returns A function that returns a fresh number in [0, 1) on each call.
 */
function createPrng(seed: number): () => number {
	let state = seed | 0;
	return (): number => {
		state = (state + 0x6d2b79f5) | 0;
		let result = Math.imul(state ^ (state >>> 15), 1 | state);
		result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
		return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/**
 * Computes the wrap-around translation offsets for a motif placement.
 *
 * If a motif at (cx, cy) with effective radius `r` crosses any of the four
 * tile edges, the motif is duplicated at the opposite edge so the partial
 * halves align when tiles are repeated. Corner-crossings are duplicated to
 * three additional positions to cover the diagonal seam.
 */
function wrapOffsets(
	cx: number,
	cy: number,
	r: number,
	tile: number
): readonly (readonly [number, number])[] {
	const offsets: [number, number][] = [[0, 0]];
	const overLeft = cx - r < 0;
	const overRight = cx + r > tile;
	const overTop = cy - r < 0;
	const overBottom = cy + r > tile;

	if (overLeft) offsets.push([tile, 0]);
	if (overRight) offsets.push([-tile, 0]);
	if (overTop) offsets.push([0, tile]);
	if (overBottom) offsets.push([0, -tile]);
	if (overLeft && overTop) offsets.push([tile, tile]);
	if (overRight && overTop) offsets.push([-tile, tile]);
	if (overLeft && overBottom) offsets.push([tile, -tile]);
	if (overRight && overBottom) offsets.push([-tile, -tile]);

	return offsets;
}

/** Configuration for {@link generateWhimsyTile}. */
export interface WhimsyTileOptions {
	/** Tile dimension in pixels. The tile is square. Defaults to 240. */
	size?: number;
	/** Deterministic seed. Same seed + same options = same SVG. Defaults to 42. */
	seed?: number;
	/**
	 * Number of placement cells per row and column. Higher = denser pattern.
	 * The total motif count is `grid * grid`. Defaults to 6 (36 motifs).
	 */
	grid?: number;
	/** Lower bound for the random scale factor applied to each motif. */
	scaleMin?: number;
	/** Upper bound for the random scale factor applied to each motif. */
	scaleMax?: number;
	/**
	 * Restricts the motif set the generator can pick from. Pass a preset from
	 * {@link WHIMSY_THEMES} or any custom `MotifId[]`. When omitted, every
	 * motif in {@link KAWAII_MOTIFS} is eligible (the kawaii theme).
	 */
	motifs?: readonly MotifId[];
}

/**
 * Generates a seamlessly-tiling kawaii SVG pattern as a string.
 *
 * The returned SVG has no fill color of its own; the only `fill` attribute is
 * set on the wrapping `<g>` to ensure all child shapes participate in the mask
 * alpha. Apply color via `background-color` together with `mask-image` in CSS.
 *
 * @param options - Tile size, grid density, seed, and scale bounds.
 * @returns The complete `<svg>...</svg>` markup ready to be encoded as a data URI.
 */
export function generateWhimsyTile(options: WhimsyTileOptions = {}): string {
	const size = options.size ?? DEFAULT_TILE_SIZE;
	const grid = options.grid ?? DEFAULT_GRID;
	const seed = options.seed ?? DEFAULT_SEED;
	const scaleMin = options.scaleMin ?? DEFAULT_SCALE_MIN;
	const scaleMax = options.scaleMax ?? DEFAULT_SCALE_MAX;

	// When a motif filter is supplied, drop any library entries not in the
	// allow-list. Falling back to the full library if the filter ends up empty
	// means a typo or empty array still produces a valid (if generic) tile
	// instead of a blank surface.
	const allowedMotifs: readonly Motif[] = options.motifs?.length
		? KAWAII_MOTIFS.filter((m) => options.motifs?.includes(m.id))
		: KAWAII_MOTIFS;
	const motifPool = allowedMotifs.length > 0 ? allowedMotifs : KAWAII_MOTIFS;

	const rand = createPrng(seed);
	const cell = size / grid;
	const fragments: string[] = [];

	for (let gy = 0; gy < grid; gy++) {
		for (let gx = 0; gx < grid; gx++) {
			const motifIndex = Math.floor(rand() * motifPool.length);
			const motif = motifPool[motifIndex] ?? motifPool[0];
			// Fallback above pacifies noUncheckedIndexedAccess; pool is non-empty.
			if (!motif) continue;

			const scale = scaleMin + rand() * (scaleMax - scaleMin);
			const effectiveRadius = motif.radius * scale;
			// Inset the motif center from cell edges by one effective radius so the
			// full shape stays within reasonable bounds before wrap is computed.
			const inset = Math.min(effectiveRadius, cell / 2 - 1);
			const cellMinX = gx * cell + inset;
			const cellMinY = gy * cell + inset;
			const cellRange = Math.max(cell - 2 * inset, 0);
			const cx = cellMinX + rand() * cellRange;
			const cy = cellMinY + rand() * cellRange;
			const rotation = rand() * 360;

			for (const [dx, dy] of wrapOffsets(cx, cy, effectiveRadius, size)) {
				const tx = (cx + dx).toFixed(2);
				const ty = (cy + dy).toFixed(2);
				const r = rotation.toFixed(1);
				const s = scale.toFixed(2);
				fragments.push(
					`<g transform="translate(${tx} ${ty}) rotate(${r}) scale(${s})">${motif.shape}</g>`
				);
			}
		}
	}

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
		'<g fill="black">',
		fragments.join(''),
		'</g>',
		'</svg>',
	].join('');
}

/**
 * Encodes a generated SVG string as a `data:image/svg+xml,...` URI suitable
 * for `mask-image` or `background-image`. Only the characters that break URI
 * parsing inside CSS `url("...")` strings are escaped, keeping the URI short.
 *
 * @param svg - A complete SVG string, e.g. the output of {@link generateWhimsyTile}.
 * @returns A data URI ready to drop into `url("...")`.
 */
export function svgToDataUri(svg: string): string {
	const encoded = svg
		.replace(/"/g, "'")
		.replace(/</g, '%3C')
		.replace(/>/g, '%3E')
		.replace(/#/g, '%23')
		.replace(/\s+/g, ' ');
	return `data:image/svg+xml;utf8,${encoded}`;
}
