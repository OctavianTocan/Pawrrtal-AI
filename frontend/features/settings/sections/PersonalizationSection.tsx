'use client';

import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SettingsCard, SettingsRow, Switch } from '../primitives';

/** Personality presets shown in the personality dropdown. */
const PERSONALITY_OPTIONS = ['Pragmatic', 'Friendly', 'Concise', 'Playful'] as const;

/**
 * Visual-only Personalization settings section.
 *
 * Mirrors the reference layout: personality picker, custom instructions
 * textarea, and an experimental "Memory" group with two toggles + a
 * destructive Reset action. None of these write to the backend yet.
 */
export function PersonalizationSection(): React.JSX.Element {
	const [enableMemories, setEnableMemories] = useState(true);
	const [skipToolChats, setSkipToolChats] = useState(false);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h2 className="text-lg font-semibold text-foreground">Personalization</h2>
			</header>

			<SettingsCard>
				<SettingsRow
					description="Choose a default tone for AI Nexus responses"
					label="Personality"
				>
					<select
						className="rounded-[7px] border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
						defaultValue="Pragmatic"
					>
						{PERSONALITY_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</SettingsRow>
			</SettingsCard>

			<section className="flex flex-col gap-2">
				<header className="flex flex-col gap-0.5">
					<h3 className="text-sm font-semibold text-foreground">Custom instructions</h3>
					<p className="text-xs text-muted-foreground">
						Give AI Nexus extra instructions and context for your project. Learn more
					</p>
				</header>
				<SettingsCard>
					<Textarea
						className="min-h-32 resize-y border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
						placeholder="Add your custom instructions…"
					/>
					<div className="flex justify-end pt-2">
						<Button size="sm" type="button" variant="secondary">
							Save
						</Button>
					</div>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-2">
				<header className="flex flex-col gap-0.5">
					<h3 className="text-sm font-semibold text-foreground">Memory (experimental)</h3>
					<p className="text-xs text-muted-foreground">
						Configure how AI Nexus collects, retains, and consolidates memories. Learn
						more
					</p>
				</header>
				<SettingsCard>
					<SettingsRow
						description="Generate new memories from chats and bring them into new chats"
						label="Enable memories"
					>
						<Switch checked={enableMemories} onCheckedChange={setEnableMemories} />
					</SettingsRow>
					<SettingsRow
						description="Do not generate memories from chats that used MCP tools or web search"
						label="Skip tool-assisted chats"
					>
						<Switch checked={skipToolChats} onCheckedChange={setSkipToolChats} />
					</SettingsRow>
					<SettingsRow description="Delete all AI Nexus memories" label="Reset memories">
						<Button
							className="text-destructive hover:text-destructive"
							size="sm"
							type="button"
							variant="ghost"
						>
							Reset
						</Button>
					</SettingsRow>
				</SettingsCard>
			</section>
		</div>
	);
}
