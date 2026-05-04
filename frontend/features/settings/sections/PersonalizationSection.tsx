'use client';

import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
	loadPersonalizationProfile,
	PERSONALITY_OPTIONS,
	type PersonalityId,
	type PersonalizationProfile,
	savePersonalizationProfile,
} from '@/features/personalization/storage';
import { SettingsCard, SettingsRow, Switch } from '../primitives';

/**
 * Personalization settings section.
 *
 * Reads + writes the same `nexus:personalization` localStorage profile
 * that the v2 onboarding flow collects, so a personality picked in
 * onboarding shows up here pre-selected (and edits here flow back to
 * the profile).
 */
export function PersonalizationSection(): React.JSX.Element {
	const [profile, setProfile] = useState<PersonalizationProfile>(() =>
		loadPersonalizationProfile()
	);
	const [enableMemories, setEnableMemories] = useState(true);
	const [skipToolChats, setSkipToolChats] = useState(false);

	// Re-load on mount so SSR-served HTML doesn't pin an empty profile —
	// localStorage is only available client-side after hydration.
	useEffect(() => {
		setProfile(loadPersonalizationProfile());
	}, []);

	const patchProfile = (patch: Partial<PersonalizationProfile>): void => {
		setProfile((current) => {
			const next = { ...current, ...patch };
			savePersonalizationProfile(next);
			return next;
		});
	};

	const personality: PersonalityId = profile.personality ?? PERSONALITY_OPTIONS[0].id;

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h2 className="text-lg font-semibold text-foreground">Personalization</h2>
			</header>

			<SettingsCard>
				<SettingsRow
					description="Choose a default tone for your agent's responses"
					label="Personality"
				>
					<select
						className="rounded-[7px] border border-foreground/10 bg-foreground/[0.03] px-2.5 py-1 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
						onChange={(event) =>
							patchProfile({ personality: event.target.value as PersonalityId })
						}
						value={personality}
					>
						{PERSONALITY_OPTIONS.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</SettingsRow>
			</SettingsCard>

			<section className="flex flex-col gap-2">
				<header className="flex flex-col gap-0.5">
					<h3 className="text-sm font-semibold text-foreground">Custom instructions</h3>
					<p className="text-xs text-muted-foreground">
						Give your agent extra instructions and context for your project.
					</p>
				</header>
				<SettingsCard>
					<Textarea
						className="min-h-32 resize-y border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
						onChange={(event) =>
							patchProfile({ customInstructions: event.target.value })
						}
						placeholder="Add your custom instructions…"
						value={profile.customInstructions ?? ''}
					/>
					<div className="flex justify-end pt-2">
						<Button size="sm" type="button" variant="secondary">
							Saved
						</Button>
					</div>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-2">
				<header className="flex flex-col gap-0.5">
					<h3 className="text-sm font-semibold text-foreground">Memory (experimental)</h3>
					<p className="text-xs text-muted-foreground">
						Configure how the agent collects, retains, and consolidates memories.
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
					<SettingsRow description="Delete all stored memories" label="Reset memories">
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
