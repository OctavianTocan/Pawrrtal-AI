'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SETTINGS_SECTIONS, type SettingsSectionId } from './constants';
import { AppearanceSection } from './sections/AppearanceSection';
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

	return (
		<div className="grid h-svh w-full grid-cols-[260px_1fr] bg-sidebar">
			<aside className="flex h-full flex-col gap-4 overflow-y-auto border-r border-foreground/8 px-3 py-4">
				<button
					className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
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
									'group flex items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left text-sm transition-colors',
									isActive
										? 'bg-foreground/[0.07] text-foreground'
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
