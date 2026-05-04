'use client';

import { LaptopMinimal, Moon, Sun } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SettingsCard, SettingsRow, Slider, Switch } from '../primitives';

/** Theme mode the user can pick in the Theme card. */
type ThemeMode = 'light' | 'dark' | 'system';

/** Per-theme color/font configuration shown in the Light + Dark cards. */
type ThemeConfig = {
	accent: string;
	background: string;
	foreground: string;
	uiFont: string;
	codeFont: string;
	translucentSidebar: boolean;
	contrast: number;
};

const DEFAULT_LIGHT: ThemeConfig = {
	accent: '#FF6363',
	background: '#FFFFFF',
	foreground: '#030303',
	uiFont: 'Inter',
	codeFont: '"JetBrains Mono"',
	translucentSidebar: true,
	contrast: 54,
};

const DEFAULT_DARK: ThemeConfig = {
	accent: '#1F6FEB',
	background: '#0D1117',
	foreground: '#E6EDF3',
	uiFont: '-apple-system, BlinkMacSystemFont',
	codeFont: 'ui-monospace, "SFMono-Regular"',
	translucentSidebar: true,
	contrast: 60,
};

/** Toggle group used for the top-of-card Theme switcher. */
function ThemeModeToggle({
	value,
	onChange,
}: {
	value: ThemeMode;
	onChange: (mode: ThemeMode) => void;
}): React.JSX.Element {
	const options = [
		{ id: 'light' as const, label: 'Light', Icon: Sun },
		{ id: 'dark' as const, label: 'Dark', Icon: Moon },
		{ id: 'system' as const, label: 'System', Icon: LaptopMinimal },
	];
	return (
		<div className="flex items-center gap-1 rounded-[8px] border border-foreground/10 bg-foreground/[0.03] p-0.5">
			{options.map((option) => {
				const isActive = value === option.id;
				return (
					<button
						aria-pressed={isActive}
						className={cn(
							'flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs transition-colors',
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
 * Diff-style preview rendered above the Light/Dark theme cards.
 *
 * Mirrors the reference screenshot's red/green code-diff card — entirely
 * cosmetic, no live theme is computed from the inputs. Will become real
 * once the theming engine ships.
 */
function ThemeDiffPreview(): React.JSX.Element {
	return (
		<div className="overflow-hidden rounded-[10px] border border-foreground/10 bg-background font-mono text-[12px]">
			<div className="grid grid-cols-2 divide-x divide-foreground/10">
				<pre className="m-0 bg-red-500/8 px-3 py-2 leading-5">
					<code>
						{`1  const themePreview: ThemeConfig = {\n`}
						{`2    surface: "sidebar",\n`}
						{`3    accent: "#2563eb",\n`}
						{`4    contrast: 42,\n`}
						{`5  };`}
					</code>
				</pre>
				<pre className="m-0 bg-emerald-500/8 px-3 py-2 leading-5">
					<code>
						{`1  const themePreview: ThemeConfig = {\n`}
						{`2    surface: "sidebar-elevated",\n`}
						{`3    accent: "#0ea5e9",\n`}
						{`4    contrast: 68,\n`}
						{`5  };`}
					</code>
				</pre>
			</div>
		</div>
	);
}

/** A single colored swatch + hex input row inside a theme card. */
function ColorRow({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (next: string) => void;
}): React.JSX.Element {
	return (
		<SettingsRow label={label}>
			<div className="flex items-center gap-2 rounded-[6px] border border-foreground/10 bg-foreground/[0.03] px-1.5 py-1">
				<span
					aria-hidden="true"
					className="size-3.5 rounded-full border border-foreground/10"
					style={{ backgroundColor: value }}
				/>
				<input
					aria-label={`${label} hex value`}
					className="w-24 bg-transparent text-xs outline-none"
					onChange={(event) => onChange(event.target.value)}
					value={value}
				/>
			</div>
		</SettingsRow>
	);
}

/** A single font-family input row inside a theme card. */
function FontRow({ label, value }: { label: string; value: string }): React.JSX.Element {
	return (
		<SettingsRow label={label}>
			<Input className="w-44 text-xs" defaultValue={value} />
		</SettingsRow>
	);
}

/** Renders one of the two themed cards (Light / Dark) with all its controls. */
function ThemeCard({
	heading,
	preset,
	config,
	onConfigChange,
}: {
	heading: string;
	preset: string;
	config: ThemeConfig;
	onConfigChange: (next: ThemeConfig) => void;
}): React.JSX.Element {
	const update = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]): void => {
		onConfigChange({ ...config, [key]: value });
	};

	return (
		<SettingsCard>
			<header className="flex items-center justify-between border-b border-foreground/5 pb-2">
				<span className="text-sm font-semibold text-foreground">{heading}</span>
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<button className="hover:text-foreground" type="button">
						Import
					</button>
					<button className="hover:text-foreground" type="button">
						Copy theme
					</button>
					<span className="rounded-[6px] border border-foreground/10 bg-foreground/[0.03] px-2 py-1 text-foreground">
						{preset}
					</span>
				</div>
			</header>
			<ColorRow
				label="Accent"
				onChange={(next) => update('accent', next)}
				value={config.accent}
			/>
			<ColorRow
				label="Background"
				onChange={(next) => update('background', next)}
				value={config.background}
			/>
			<ColorRow
				label="Foreground"
				onChange={(next) => update('foreground', next)}
				value={config.foreground}
			/>
			<FontRow label="UI font" value={config.uiFont} />
			<FontRow label="Code font" value={config.codeFont} />
			<SettingsRow label="Translucent sidebar">
				<Switch
					checked={config.translucentSidebar}
					onCheckedChange={(checked) => update('translucentSidebar', checked)}
				/>
			</SettingsRow>
			<SettingsRow label="Contrast">
				<div className="flex w-56 items-center gap-3">
					<Slider
						max={100}
						min={0}
						onValueChange={(values) => {
							const next = values[0];
							if (typeof next === 'number') update('contrast', next);
						}}
						step={1}
						value={[config.contrast]}
					/>
					<span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
						{config.contrast}
					</span>
				</div>
			</SettingsRow>
		</SettingsCard>
	);
}

/**
 * Visual-only Appearance settings section.
 *
 * Includes the theme switcher, themePreview diff card, Light + Dark theme
 * cards, pointer-cursor toggle, and UI font size input. State is local —
 * none of this drives the live application theme.
 */
export function AppearanceSection(): React.JSX.Element {
	const [mode, setMode] = useState<ThemeMode>('system');
	const [light, setLight] = useState<ThemeConfig>(DEFAULT_LIGHT);
	const [dark, setDark] = useState<ThemeConfig>(DEFAULT_DARK);
	const [pointerCursors, setPointerCursors] = useState(true);
	const [uiFontSize, setUiFontSize] = useState('14');

	return (
		<div className="flex flex-col gap-6">
			<SettingsCard>
				<header className="flex items-center justify-between border-b border-foreground/5 pb-2">
					<div className="flex flex-col">
						<span className="text-sm font-semibold text-foreground">Theme</span>
						<span className="text-xs text-muted-foreground">
							Use light, dark, or match your system
						</span>
					</div>
					<ThemeModeToggle onChange={setMode} value={mode} />
				</header>
				<div className="pt-3">
					<ThemeDiffPreview />
				</div>
			</SettingsCard>

			<ThemeCard
				config={light}
				heading="Light theme"
				onConfigChange={setLight}
				preset="Raycast"
			/>
			<ThemeCard
				config={dark}
				heading="Dark theme"
				onConfigChange={setDark}
				preset="GitHub"
			/>

			<SettingsCard>
				<SettingsRow
					description="Change the cursor to a pointer when hovering over interactive elements"
					label="Use pointer cursors"
				>
					<Switch checked={pointerCursors} onCheckedChange={setPointerCursors} />
				</SettingsRow>
				<SettingsRow
					description="Adjust the base size used for the AI Nexus UI"
					label="UI font size"
				>
					<div className="flex items-center gap-2">
						<Input
							className="w-16 text-right text-sm"
							onChange={(event) => setUiFontSize(event.target.value)}
							type="number"
							value={uiFontSize}
						/>
						<span className="text-xs text-muted-foreground">px</span>
					</div>
				</SettingsRow>
			</SettingsCard>
		</div>
	);
}
