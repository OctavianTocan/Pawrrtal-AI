'use client';

import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsCard, SettingsRow, Switch } from '../primitives';

/**
 * Visual-only General settings section.
 *
 * Mirrors the Codex-style "Profile / Preferences / Notifications" layout
 * from the reference screenshot. State is local + cosmetic — no real
 * persistence wired this round.
 */
export function GeneralSection(): React.JSX.Element {
	return (
		<div className="flex flex-col gap-8">
			<header>
				<h2 className="text-lg font-semibold text-foreground">Settings</h2>
			</header>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-foreground">Profile</h3>
				<SettingsCard>
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
						description="We will keep these in mind across chats. Learn more"
						label="Instructions for AI Nexus"
					>
						<Textarea
							className="min-h-24 w-72 resize-none"
							placeholder="e.g. keep explanations brief and to the point"
						/>
					</SettingsRow>
				</SettingsCard>
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-foreground">Preferences</h3>
				<SettingsCard>
					<SettingsRow label="Appearance">
						<div className="flex items-center gap-1 rounded-[7px] border border-foreground/10 p-0.5">
							<button
								className="rounded-[5px] bg-foreground/10 px-2 py-1 text-xs"
								type="button"
							>
								System
							</button>
							<button
								className="rounded-[5px] px-2 py-1 text-xs text-muted-foreground"
								type="button"
							>
								Light
							</button>
							<button
								className="rounded-[5px] px-2 py-1 text-xs text-muted-foreground"
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
			</section>

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-semibold text-foreground">Notifications</h3>
				<SettingsCard>
					<SettingsRow
						description="Get notified when AI Nexus has finished a response. Useful for long-running tasks."
						label="Response completions"
					>
						<Switch defaultChecked />
					</SettingsRow>
				</SettingsCard>
			</section>
		</div>
	);
}
