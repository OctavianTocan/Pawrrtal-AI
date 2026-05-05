'use client';

/**
 * Local primitives used only by the settings surface.
 *
 * Lives in-feature rather than `components/ui` because today these are not
 * shared anywhere else — promote them out if a second feature needs them.
 *
 * @fileoverview Switch, Slider, and labelled-row helpers for the settings UI.
 */

import { Slider as SliderPrimitive, Switch as SwitchPrimitive } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Compact accent-tinted toggle.
 *
 * Renders a small radix Switch with the project's accent + border tokens so
 * it visually matches the toggle in the reference screenshots without
 * reaching for a full shadcn-style component file.
 */
export function Switch({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>): React.JSX.Element {
	return (
		<SwitchPrimitive.Root
			className={cn(
				'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
				'border border-foreground/10 bg-foreground/10 transition-colors',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
				'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
				'disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				className={cn(
					'pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0',
					'transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5'
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

/**
 * Single-thumb slider with the project's accent fill on the active track.
 *
 * Matches the contrast slider in the Appearance section — value + range
 * accepted as numbers so consumers can hold local state without coercing.
 */
export function Slider({
	className,
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root>): React.JSX.Element {
	return (
		<SliderPrimitive.Root
			className={cn('relative flex w-full touch-none select-none items-center', className)}
			{...props}
		>
			<SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-foreground/10">
				<SliderPrimitive.Range className="absolute h-full bg-accent" />
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb
				aria-label="Slider value"
				className="block size-4 rounded-full border-2 border-accent bg-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
			/>
		</SliderPrimitive.Root>
	);
}

/** Props for the labelled row used throughout the settings sections. */
export type SettingsRowProps = {
	/** Bold label rendered on the left. */
	label: React.ReactNode;
	/** Optional secondary helper text under the label. */
	description?: React.ReactNode;
	/** The control / value rendered on the right. */
	children: React.ReactNode;
	/** Override classes on the outer row. */
	className?: string;
};

/**
 * Two-column row used by every settings section (label/description on the
 * left, control on the right). Centralised so the spacing rhythm stays
 * identical across all sections.
 *
 * The label column is fixed-width (240px) so labels and controls align
 * across rows even when label text varies — matches the Codex/Claude
 * reference layout where every value floats on the same vertical line.
 * Override with `className` (e.g. `items-start`) when stacking taller
 * controls like textareas.
 */
export function SettingsRow({
	label,
	description,
	children,
	className,
}: SettingsRowProps): React.JSX.Element {
	return (
		<div
			className={cn(
				'flex items-center justify-between gap-6 border-b border-foreground/5 py-3.5 first:pt-1 last:border-0 last:pb-1',
				className
			)}
		>
			<div className="flex min-w-0 max-w-[55%] flex-col gap-1">
				<span className="text-sm font-medium text-foreground tabular-nums">{label}</span>
				{description ? (
					<span className="text-pretty text-sm text-muted-foreground tabular-nums">
						{description}
					</span>
				) : null}
			</div>
			<div className="flex shrink-0 items-center justify-end gap-2 text-right">
				{children}
			</div>
		</div>
	);
}

/** Props for the section card wrapper. */
export type SettingsCardProps = {
	/** Section heading rendered above the card body. */
	title?: React.ReactNode;
	/** Optional helper line under the title. */
	description?: React.ReactNode;
	/** Card body — typically a stack of `SettingsRow`s. */
	children: React.ReactNode;
	/** Override classes on the card root. */
	className?: string;
};

/**
 * Card surface used to group related rows in a settings section.
 *
 * Visual equivalent of the rounded panels in the reference screenshots —
 * border + subtle inset background, padded content.
 */
export function SettingsCard({
	title,
	description,
	children,
	className,
}: SettingsCardProps): React.JSX.Element {
	return (
		<section
			className={cn(
				'rounded-[12px] border border-foreground/10 bg-foreground/[0.02] px-6 py-2',
				className
			)}
		>
			{title || description ? (
				<header className="mb-1 flex flex-col gap-0.5 pt-3">
					{title ? (
						<h3 className="text-sm font-semibold text-foreground">{title}</h3>
					) : null}
					{description ? (
						<p className="text-pretty text-sm text-muted-foreground">{description}</p>
					) : null}
				</header>
			) : null}
			<div className="flex flex-col">{children}</div>
		</section>
	);
}

/** Props for the page-level shell wrapping every Settings section. */
export type SettingsPageProps = {
	/** Page title rendered as `<h1>` at the top. */
	title: React.ReactNode;
	/** Optional sub-line beneath the title (text-pretty, muted). */
	description?: React.ReactNode;
	/** Page body — typically a stack of `SettingsCard`s. */
	children: React.ReactNode;
	/** Override classes on the page root. */
	className?: string;
};

/**
 * Page-level shell EVERY Settings section MUST wrap itself in.
 *
 * Standardises the outer rhythm — same `<h1>` size, same gap below the
 * title, same gap between sections, same `text-pretty` description.
 * Bespoke `<header><h1>` blocks per section are a consistency bug; use
 * this instead. Documented in `DESIGN.md` →
 * `Components` → `settings-page-shell`.
 */
export function SettingsPage({
	title,
	description,
	children,
	className,
}: SettingsPageProps): React.JSX.Element {
	return (
		<div className={cn('flex flex-col gap-8', className)}>
			<header className="flex flex-col gap-1.5">
				<h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				{description ? (
					<p className="text-pretty text-sm text-muted-foreground">{description}</p>
				) : null}
			</header>
			<div className="flex flex-col gap-6">{children}</div>
		</div>
	);
}

/** Props for the consistent settings-section header. */
export type SettingsSectionHeaderProps = {
	/** Section heading rendered on the left. */
	title: React.ReactNode;
	/** Sub-line under the title (small, muted, `text-pretty`). */
	description?: React.ReactNode;
	/** Right-aligned actions / pickers (e.g. preset selector, mode toggle). */
	actions?: React.ReactNode;
};

/**
 * Standard top-of-card header used by every section / sub-section
 * across Settings — title (`text-sm font-semibold`), description
 * (`text-xs text-muted-foreground text-pretty`), and an optional
 * right-aligned actions slot. Centralised so every section shares the
 * exact same vertical rhythm and type rules — no more bespoke
 * one-off headers.
 *
 * Use INSIDE a `SettingsCard` (not as a replacement for it). The
 * `SettingsCard` handles the rounded surface; this primitive renders
 * the header row with its bottom hairline.
 */
export function SettingsSectionHeader({
	title,
	description,
	actions,
}: SettingsSectionHeaderProps): React.JSX.Element {
	return (
		<header className="flex items-start justify-between gap-3 border-b border-foreground/5 pt-1 pb-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-semibold text-foreground">{title}</span>
				{description ? (
					<span className="text-pretty text-xs text-muted-foreground">{description}</span>
				) : null}
			</div>
			{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
		</header>
	);
}
