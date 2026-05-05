'use client';

import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	SettingsCard,
	SettingsPage,
	SettingsRow,
	SettingsSectionHeader,
	Switch,
} from '../primitives';

/**
 * Visual-only General settings section.
 *
 * Mirrors the Codex-style "Profile / Preferences / Notifications" layout
 * from the reference screenshot. State is local + cosmetic — no real
 * persistence wired this round.
 */
export function GeneralSection(): React.JSX.Element {
	return (
		<SettingsPage
			description="Profile, preferences, and notifications for your account."
			title="General"
		>
			<SettingsCard>
				<SettingsSectionHeader
					description="How you appear inside AI Nexus and how it should address you."
					title="Profile"
				/>
				<SettingsRow label="Avatar">
					<Avatar className="size-9">
						<AvatarImage alt="Avatar" src="" />
						<AvatarFallback className="text-xs">OT</AvatarFallback>
					</Avatar>
				</SettingsRow>
				<SettingsRow label="Full name">
					<Input className="w-56" defaultValue="Octavian Tocan" />
				</SettingsRow>
				<SettingsRow label="What should we call you?">
					<Input className="w-56" defaultValue="Tavi" />
				</SettingsRow>
				<SettingsRow label="What best describes your work?">
					<Input className="w-56" defaultValue="Engineering" />
				</SettingsRow>
				<SettingsRow
					className="items-start"
					description="Kept in mind across chats."
					label="Instructions for AI Nexus"
				>
					<Textarea
						className="min-h-24 w-72 resize-none"
						placeholder="e.g. keep explanations brief and to the point"
					/>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard>
				<SettingsSectionHeader
					description="Light surface defaults and language settings."
					title="Preferences"
				/>
				<SettingsRow
					description="Detailed theme controls live under Appearance."
					label="Appearance"
				>
					<div
						aria-label="Quick theme mode"
						className="flex items-center gap-1 rounded-[8px] border border-border/50 bg-foreground/[0.03] p-0.5"
						role="toolbar"
					>
						{/* The active pill uses `bg-background + shadow-sm` instead
						   of a foreground/10 wash so it lifts cleanly off the
						   muted track — same recipe as the Appearance section's
						   ThemeModeToggle. Visual-only mock today; the live
						   wiring lives under the Appearance section. */}
						<button
							aria-pressed="true"
							className="cursor-pointer rounded-[6px] bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors duration-150 ease-out"
							type="button"
						>
							System
						</button>
						<button
							className="cursor-pointer rounded-[6px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-foreground/[0.05] hover:text-foreground"
							type="button"
						>
							Light
						</button>
						<button
							className="cursor-pointer rounded-[6px] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:bg-foreground/[0.05] hover:text-foreground"
							type="button"
						>
							Dark
						</button>
					</div>
				</SettingsRow>
				<SettingsRow label="Chat font">
					<span className="text-sm text-muted-foreground">Inter</span>
				</SettingsRow>
				<SettingsRow label="Voice">
					<span className="text-sm text-muted-foreground">Default</span>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard>
				<SettingsSectionHeader
					description="System-level alerts AI Nexus can surface to you."
					title="Notifications"
				/>
				<SettingsRow
					description="Get notified when AI Nexus has finished a response. Useful for long-running tasks."
					label="Response completions"
				>
					<Switch defaultChecked />
				</SettingsRow>
			</SettingsCard>
		</SettingsPage>
	);
}
