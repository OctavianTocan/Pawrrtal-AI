#!/usr/bin/env bun
/**
 * Convert every `themes/*.md` (DESIGN.md spec) into a typed preset
 * registry that the Settings → Appearance panel can pick from.
 *
 * Output: `frontend/features/appearance/presets.generated.ts`
 *
 * The generated file is committed so feature code doesn't depend on a
 * runtime build step. Re-run `bun run themes:build` after editing any
 * file in `themes/`.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '..');
const THEMES_DIR = join(REPO_ROOT, 'themes');
const OUT_FILE = join(REPO_ROOT, 'frontend/features/appearance/presets.generated.ts');

/** Six semantic color slots (must mirror `features/appearance/types.ts`). */
const COLOR_SLOT_KEYS = [
	'background',
	'foreground',
	'accent',
	'info',
	'success',
	'destructive',
] as const;

/** Three font slots — display + sans + mono. */
const FONT_SLOT_KEYS = ['display', 'sans', 'mono'] as const;

/** Possible YAML keys (in DESIGN.md specs) that map onto a `display` font. */
const DISPLAY_TYPOGRAPHY_KEYS = [
	'display',
	'display-lg',
	'hero-display',
	'h1',
	'heading-1',
] as const;

/** Possible YAML keys that map onto the project `sans` font. */
const SANS_TYPOGRAPHY_KEYS = ['body-md', 'body-lg', 'body', 'subtitle', 'h2'] as const;

/** Possible YAML keys that map onto the project `mono` font. */
const MONO_TYPOGRAPHY_KEYS = ['code', 'code-md', 'code-block'] as const;

/** Output rows for the generated registry. */
interface Preset {
	id: string;
	name: string;
	description: string;
	colors: Partial<Record<(typeof COLOR_SLOT_KEYS)[number], string>>;
	fonts: Partial<Record<(typeof FONT_SLOT_KEYS)[number], string>>;
}

/**
 * Strip YAML front matter from a markdown file.
 * Returns `[frontMatter, body]` — empty front matter when the file has none.
 */
function splitFrontMatter(source: string): [string, string] {
	if (!source.startsWith('---')) return ['', source];
	const end = source.indexOf('\n---', 3);
	if (end === -1) return ['', source];
	return [source.slice(3, end).trim(), source.slice(end + 4).trim()];
}

/**
 * Minimal YAML scalar parser for the subset of structures DESIGN.md uses.
 *
 * We don't want a full YAML dep tree just to read flat key/value maps and
 * one or two levels of nesting. The DESIGN.md spec keeps front matter
 * shallow on purpose — `colors.<slot>` is `key: "#hex"`, typography is
 * `name: { key: value, … }` either inline-flow or nested-block.
 */
function parseFlatYaml(text: string): Record<string, unknown> {
	const lines = text.split('\n');
	const root: Record<string, unknown> = {};
	const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [
		{ indent: -1, obj: root },
	];

	for (const rawLine of lines) {
		if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) continue;
		const indent = rawLine.length - rawLine.trimStart().length;
		const line = rawLine.trim();
		const colon = line.indexOf(':');
		if (colon === -1) continue;
		const key = line.slice(0, colon).trim();
		const rest = line.slice(colon + 1).trim();

		// Pop the stack until we find a parent at strictly lower indent.
		while (stack.length > 1 && (stack[stack.length - 1]?.indent ?? -1) >= indent) {
			stack.pop();
		}
		const parent = stack[stack.length - 1]?.obj ?? root;

		if (rest === '') {
			// Nested block: child entries follow on subsequent indented lines.
			const child: Record<string, unknown> = {};
			parent[key] = child;
			stack.push({ indent, obj: child });
			continue;
		}

		// Flow-style inline object: `{ a: 1, b: 2 }`.
		if (rest.startsWith('{') && rest.endsWith('}')) {
			const inner = rest.slice(1, -1).trim();
			const child: Record<string, unknown> = {};
			for (const piece of inner.split(',')) {
				const sub = piece.trim();
				if (sub === '') continue;
				const subColon = sub.indexOf(':');
				if (subColon === -1) continue;
				const k = sub.slice(0, subColon).trim();
				const v = unquote(sub.slice(subColon + 1).trim());
				child[k] = v;
			}
			parent[key] = child;
			continue;
		}

		parent[key] = unquote(rest);
	}

	return root;
}

/** Strip wrapping quotes / trim — leaves bare strings alone. */
function unquote(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

/** Pick the first matching key out of a list, returning `string | null`. */
function pickFirst(
	source: Record<string, unknown> | undefined,
	keys: readonly string[]
): string | null {
	if (!source) return null;
	for (const key of keys) {
		const block = source[key];
		if (typeof block === 'object' && block !== null) {
			const family = (block as Record<string, unknown>).fontFamily;
			if (typeof family === 'string' && family.length > 0) return family;
		}
	}
	return null;
}

/** Convert a parsed front-matter object into our Preset shape. */
function toPreset(id: string, parsed: Record<string, unknown>, descFallback: string): Preset {
	const name = (parsed.name as string | undefined)?.trim() || id;
	const description =
		(parsed.description as string | undefined)?.trim() || descFallback || `${name} preset`;

	const colorsBlock = (parsed.colors as Record<string, unknown> | undefined) ?? {};
	const colors: Preset['colors'] = {};
	for (const slot of COLOR_SLOT_KEYS) {
		const fromSlot = colorsBlock[slot];
		if (typeof fromSlot === 'string' && fromSlot.length > 0) {
			colors[slot] = fromSlot;
		}
	}
	// `accent` falls back to `primary` if the spec uses Cursor / Mistral
	// nomenclature where `primary` is the brand voltage.
	if (!colors.accent && typeof colorsBlock.primary === 'string') {
		colors.accent = colorsBlock.primary as string;
	}

	const typographyBlock = parsed.typography as Record<string, unknown> | undefined;
	const fonts: Preset['fonts'] = {};
	const display = pickFirst(typographyBlock, DISPLAY_TYPOGRAPHY_KEYS);
	const sans = pickFirst(typographyBlock, SANS_TYPOGRAPHY_KEYS);
	const mono = pickFirst(typographyBlock, MONO_TYPOGRAPHY_KEYS);
	if (display) fonts.display = `"${display}", Georgia, "Times New Roman", serif`;
	if (sans) fonts.sans = `"${sans}", system-ui, sans-serif`;
	if (mono) fonts.mono = `"${mono}", ui-monospace, "JetBrains Mono", monospace`;

	return { id, name, description, colors, fonts };
}

function main(): void {
	const files = readdirSync(THEMES_DIR)
		.filter((entry) => extname(entry).toLowerCase() === '.md')
		.filter((entry) => entry.toLowerCase() !== 'readme.md')
		.sort();

	const presets: Preset[] = [];
	for (const file of files) {
		const source = readFileSync(join(THEMES_DIR, file), 'utf8');
		const [frontMatter, body] = splitFrontMatter(source);
		if (frontMatter === '') {
			console.warn(`themes:build — skipping ${file} (no YAML front matter)`);
			continue;
		}
		const parsed = parseFlatYaml(frontMatter);
		const id = basename(file, extname(file));
		const descFallback = body.split('\n').find((line) => line.trim().length > 0) ?? '';
		presets.push(toPreset(id, parsed, descFallback.replace(/^#+\s*/, '').trim()));
	}

	const out = `// AUTO-GENERATED — do not edit by hand.
// Run \`bun run themes:build\` to regenerate from \`themes/*.md\`.
//
// Source files: ${files.join(', ') || '(none)'}

import type { ColorSlot, FontSlot } from './types';

/**
 * A theme preset converted from a \`themes/*.md\` DESIGN.md file.
 *
 * The Appearance panel exposes these via the "Apply preset" picker.
 * Selecting a preset writes its color + font slots into the user's
 * persisted appearance settings — the panel still shows live editable
 * values so the user can fine-tune from there.
 */
export interface ThemePreset {
\t/** Stable id derived from the theme file basename. */
\tid: string;
\t/** Human-readable label shown in the picker. */
\tname: string;
\t/** Tooltip / sub-label shown under the name. */
\tdescription: string;
\t/** Sparse color overrides keyed by slot. Missing keys → use defaults. */
\tcolors: Partial<Record<ColorSlot, string>>;
\t/** Sparse font overrides keyed by slot. Missing keys → use defaults. */
\tfonts: Partial<Record<FontSlot, string>>;
}

export const THEME_PRESETS: readonly ThemePreset[] = ${JSON.stringify(presets, null, 2)} as const;
`;

	writeFileSync(OUT_FILE, out);
	console.log(`themes:build — wrote ${presets.length} preset(s) to ${OUT_FILE}`);
}

main();
