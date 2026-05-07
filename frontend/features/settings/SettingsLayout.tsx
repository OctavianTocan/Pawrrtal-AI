'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useState } from 'react';
import { useIsMacDesktop } from '@/hooks/use-is-mac-desktop';
import { cn } from '@/lib/utils';
import { SETTINGS_SECTIONS, type SettingsSectionId } from './constants';
import { AppearanceSection } from './sections/AppearanceSection';
import { ArchivedChatsSection } from './sections/ArchivedChatsSection';
import { ChannelsSection } from './sections/ChannelsSection';
import { GeneralSection } from './sections/GeneralSection';
import { IntegrationsSection } from './sections/IntegrationsSection';
import { PersonalizationSection } from './sections/PersonalizationSection';
import { PlaceholderSection } from './sections/PlaceholderSection';
import { UsageSection } from './sections/UsageSection';

/**
 * Renders the right-pane body for the currently selected section.
 *
 * Lookup-table-shaped so adding a new section means: register a row in
 * `SETTINGS_SECTIONS`, then add a case here. Anything not yet wired falls
 * through to `PlaceholderSection` automatically.
 */
function renderActiveSection(activeId: SettingsSectionId): React.ReactNode {
	if (activeId === 'general') return <GeneralSection />;
	if (activeId === 'appearance') return <AppearanceSection />;
	if (activeId === 'personalization') return <PersonalizationSection />;
	if (activeId === 'integrations') return <IntegrationsSection />;
	if (activeId === 'channels') return <ChannelsSection />;
	if (activeId === 'archived-chats') return <ArchivedChatsSection />;
	if (activeId === 'usage') return <UsageSection />;
	const section = SETTINGS_SECTIONS.find((entry) => entry.id === activeId);
	return <PlaceholderSection title={section?.label ?? 'Settings'} />;
}

/**
 * Two-pane settings shell: left rail with section list, right pane with the
 * active section's body. Visually mirrors the Codex reference settings page.
 *
 * Ships its own layout (no chat sidebar) — mounted at `/settings` outside
 * the `(app)` route group on purpose so the wider chat chrome doesn't bleed
 * through.
 */
export function SettingsLayout(): React.JSX.Element {
	const router = useRouter();
	const [activeId, setActiveId] = useState<SettingsSectionId>('general');
	const isMacDesktop = useIsMacDesktop();

	return (
		<div className="grid h-svh w-full grid-cols-[260px_1fr] bg-sidebar">
			{/* Left rail — slightly looser vertical rhythm than the chat
			    sidebar (gap-4 vs gap-2) so the section list reads like a
			    settings nav, not a project list. The rail divider uses
			    `border-border/60` so it tints itself per active theme
			    instead of stamping a hard `foreground/8` line.
			    On macOS desktop the top padding is doubled so the
			    "Back to app" button clears the system traffic-light
			    buttons that `titleBarStyle: 'hiddenInset'` parks inside
			    the BrowserWindow content area. */}
			<aside
				className={cn(
					'flex h-full flex-col gap-4 overflow-y-auto border-r border-border/60 px-3 pb-4',
					isMacDesktop ? 'pt-12' : 'pt-4'
				)}
			>
				<button
					className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.05] hover:text-foreground"
					onClick={() => router.push('/')}
					type="button"
				>
					<ArrowLeft aria-hidden="true" className="size-4" />
					<span>Back to app</span>
				</button>
				<nav className="flex flex-col gap-0.5">
					{SETTINGS_SECTIONS.map((section) => {
						const isActive = activeId === section.id;
						return (
							<button
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'group flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left text-sm transition-colors duration-150',
									isActive
										? 'bg-foreground/[0.08] font-medium text-foreground'
										: 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
								)}
								key={section.id}
								onClick={() => setActiveId(section.id)}
								type="button"
							>
								<section.Icon
									aria-hidden="true"
									className={cn(
										'size-4 shrink-0',
										isActive ? 'text-foreground' : 'text-muted-foreground'
									)}
								/>
								<span className="truncate">{section.label}</span>
							</button>
						);
					})}
				</nav>
			</aside>

			<main className="h-full overflow-y-auto bg-background px-10 py-10">
				<div className="mx-auto w-full max-w-3xl">{renderActiveSection(activeId)}</div>
			</main>
		</div>
	);
}
