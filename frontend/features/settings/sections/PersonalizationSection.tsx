'use client';

import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
	loadPersonalizationProfile,
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
 * that the v2 onboarding flow collects. On save the same shape is PUT
 * to the backend, which writes `preferences.toml` into the user's
 * workspace so the agent can read AND edit it natively (including from
 * Telegram).
 *
 * Agent personality lives in workspace `SOUL.md`, which the agent
 * itself can edit — there is no preset picker here on purpose.
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

	return (
		<SettingsPage
			description="Tune how Pawrrtal addresses you, what context it carries between chats, and how it builds memory."
			title="Personalization"
		>
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
