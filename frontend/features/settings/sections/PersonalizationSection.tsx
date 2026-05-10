'use client';

import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SelectButton, type SelectButtonOption } from '@/components/ui/select-button';
import { Textarea } from '@/components/ui/textarea';
import {
	loadPersonalizationProfile,
	PERSONALITY_OPTIONS,
	type PersonalityId,
	type PersonalizationProfile,
	savePersonalizationProfile,
} from '@/features/personalization/storage';
import {
	SettingsCard,
	SettingsPage,
	SettingsRow,
	SettingsSectionHeader,
	Switch,
} from '../primitives';

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

	// Map the storage `PERSONALITY_OPTIONS` tuple to the SelectButton's
	// `SelectButtonOption[]` shape once per render. Each personality's
	// one-line `summary` becomes the muted sub-line in the dropdown row,
	// mirroring the Codex pattern of "label + secondary explanation"
	// for picker entries.
	const personalityOptions = useMemo<SelectButtonOption[]>(
		() =>
			PERSONALITY_OPTIONS.map((option) => ({
				id: option.id,
				label: option.label,
				description: option.summary,
			})),
		[]
	);
	const activePersonality = PERSONALITY_OPTIONS.find((option) => option.id === personality);

	return (
		<SettingsPage
			description="Tune how Pawrrtal addresses you, what context it carries between chats, and how it builds memory."
			title="Personalization"
		>
			<SettingsCard>
				<SettingsSectionHeader
					description="Default tone applied to every response."
					title="Personality"
				/>
				<SettingsRow
					description="Choose a default tone for your agent's responses."
					label="Personality"
				>
					<SelectButton
						activeId={personality}
						ariaLabel="Personality"
						onSelect={(id) => patchProfile({ personality: id as PersonalityId })}
						options={personalityOptions}
						triggerLabel={activePersonality?.label ?? 'Choose'}
					/>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard>
				<SettingsSectionHeader
					description="Give your agent extra instructions and context for your project."
					title="Custom instructions"
				/>
				<Textarea
					className="min-h-32 resize-y border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
					onChange={(event) => patchProfile({ customInstructions: event.target.value })}
					placeholder="Add your custom instructions…"
					value={profile.customInstructions ?? ''}
				/>
				<div className="flex justify-end pt-2">
					<Button size="sm" type="button" variant="secondary">
						Saved
					</Button>
				</div>
			</SettingsCard>

			<SettingsCard>
				<SettingsSectionHeader
					description="Configure how the agent collects, retains, and consolidates memories."
					title="Memory (experimental)"
				/>
				<SettingsRow
					description="Generate new memories from chats and bring them into new chats."
					label="Enable memories"
				>
					<Switch checked={enableMemories} onCheckedChange={setEnableMemories} />
				</SettingsRow>
				<SettingsRow
					description="Do not generate memories from chats that used MCP tools or web search."
					label="Skip tool-assisted chats"
				>
					<Switch checked={skipToolChats} onCheckedChange={setSkipToolChats} />
				</SettingsRow>
				<SettingsRow description="Delete all stored memories." label="Reset memories">
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
		</SettingsPage>
	);
}
