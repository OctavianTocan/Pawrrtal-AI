'use client';

import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SettingsCard, SettingsRow } from '../primitives';

/** A single usage limit row with a horizontal "amount left" bar. */
function UsageLimitRow({
	label,
	resetLabel,
	percentLeft,
}: {
	label: string;
	resetLabel: string;
	percentLeft: number;
}): React.JSX.Element {
	const clamped = Math.max(0, Math.min(100, percentLeft));
	return (
		<SettingsRow
			description={resetLabel}
			label={<span className="text-sm text-foreground">{label}</span>}
		>
			<div className="flex items-center gap-3">
				<div className="h-1 w-32 overflow-hidden rounded-full bg-foreground/10">
					<div
						className={cn('h-full bg-foreground/85')}
						style={{ width: `${clamped}%` }}
					/>
				</div>
				<span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
					{clamped}% left
				</span>
			</div>
		</SettingsRow>
	);
}

/**
 * Visual-only Usage settings section.
 *
 * Mirrors the reference layout: a "General usage limits" card with a 5h
 * + weekly bar, a per-model card (placeholder for whatever model the
 * user is on), and a Credit panel with Purchase + Auto-reload Settings.
 * No real telemetry yet — the bars use static placeholder percentages.
 */
export function UsageSection(): React.JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<header>
				<h2 className="text-lg font-semibold text-foreground">Usage</h2>
			</header>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-foreground">General usage limits</h3>
				<SettingsCard>
					<UsageLimitRow
						label="5 hour usage limit"
						percentLeft={100}
						resetLabel="Resets 4:15 AM"
					/>
					<UsageLimitRow
						label="Weekly usage limit"
						percentLeft={38}
						resetLabel="Resets 7:51 AM"
					/>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-foreground">
					Claude Opus 4.7 usage limits
				</h3>
				<SettingsCard>
					<UsageLimitRow
						label="5 hour usage limit"
						percentLeft={100}
						resetLabel="Resets 4:15 AM"
					/>
					<UsageLimitRow
						label="Weekly usage limit"
						percentLeft={96}
						resetLabel="Resets May 10"
					/>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-foreground">Credit</h3>
				<SettingsCard>
					<SettingsRow
						description="Use credit to send messages when you reach usage limits."
						label="0 credit remaining"
					>
						<Button size="sm" type="button" variant="secondary">
							Purchase
						</Button>
					</SettingsRow>
					<SettingsRow
						description="Automatically add credit when you reach your minimum balance."
						label="Auto-reload credit"
					>
						<Button size="sm" type="button" variant="secondary">
							Settings
						</Button>
					</SettingsRow>
				</SettingsCard>
			</section>
		</div>
	);
}
