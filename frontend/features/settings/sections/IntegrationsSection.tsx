
import { Plus } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { AddCustomMcpModal } from '../integrations/AddCustomMcpModal';
import { AddIntegrationModal } from '../integrations/AddIntegrationModal';
import { YOUR_INTEGRATIONS } from '../integrations/catalog';
import { IntegrationRow } from '../integrations/IntegrationRow';
import { SettingsCard, SettingsPage, SettingsSectionHeader } from '../primitives';

/**
 * Visual-only Integrations settings section.
 *
 * Lists the user's connected integrations (Apple Calendar/Reminders,
 * Gmail with per-account rows, Google Calendar, Google Drive). The
 * "+ Add integration" button opens a catalog modal; the catalog has
 * an "+ Add custom" path that opens the MCP server URL modal.
 */
export function IntegrationsSection(): React.JSX.Element {
	const [showCatalog, setShowCatalog] = useState(false);
	const [showCustomMcp, setShowCustomMcp] = useState(false);

	return (
		<SettingsPage
			description="Connect AI Nexus to your tools so it can read context and run actions."
			title="Integrations"
		>
			<SettingsCard>
				<SettingsSectionHeader
					actions={
						<button
							className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-foreground/15 bg-foreground/[0.04] px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 ease-out hover:bg-foreground/[0.08]"
							onClick={() => setShowCatalog(true)}
							type="button"
						>
							<Plus className="size-3.5" />
							Add integration
						</button>
					}
					description="Apps and services AI Nexus is currently connected to."
					title="Your integrations"
				/>
				<div className="flex flex-col gap-2 pt-3">
					{YOUR_INTEGRATIONS.map((integration) => (
						<IntegrationRow integration={integration} key={integration.id} />
					))}
				</div>
			</SettingsCard>

			<AddIntegrationModal
				onAddCustom={() => {
					setShowCatalog(false);
					setShowCustomMcp(true);
				}}
				onDismiss={() => setShowCatalog(false)}
				open={showCatalog}
			/>
			<AddCustomMcpModal
				onContinue={() => setShowCustomMcp(false)}
				onDismiss={() => setShowCustomMcp(false)}
				open={showCustomMcp}
			/>
		</SettingsPage>
	);
}
