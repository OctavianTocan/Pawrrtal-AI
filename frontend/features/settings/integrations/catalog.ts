/**
 * Static catalog of integrations the Settings → Integrations section can
 * surface. Visual-only today; the `connected` flags + per-account rows
 * live in localStorage so the page can simulate state without a backend.
 */

import type { LucideIcon } from 'lucide-react';
import { Calendar, ClipboardList, FileSpreadsheet, FolderOpen, Globe, Mail } from 'lucide-react';

/** Status badge shown next to an integration / account name. */
export type IntegrationBadge = 'beta' | 'connected' | 'expired' | null;

/** Integration row metadata shown in the "Your Integrations" list. */
export interface IntegrationDef {
	/** Stable id used as React key + storage key. */
	id: string;
	/** Display name (e.g. "Apple Calendar", "Gmail"). */
	name: string;
	/** Short subtitle ("See your events in Apple Calendar"). */
	description: string;
	/** Optional badge rendered to the right of the name. */
	badge?: IntegrationBadge;
	/** Lucide icon used as the integration's avatar tile. */
	Icon: LucideIcon;
	/** Tailwind background class for the avatar tile. */
	tileBgClass: string;
	/** Tailwind text class for the avatar tile icon. */
	tileTextClass: string;
	/** Per-account rows (Gmail / Google Calendar can have multiple accounts). */
	accounts?: IntegrationAccount[];
}

/** A single account attached to an integration (Gmail address, etc). */
export interface IntegrationAccount {
	id: string;
	email: string;
	subtitle?: string;
	status: 'connected' | 'expired';
	label?: string;
}

/**
 * Master list rendered in "Your Integrations". Order here is the order
 * shown to the user. Add a new row → it shows up in the list.
 */
export const YOUR_INTEGRATIONS: IntegrationDef[] = [
	{
		id: 'apple-calendar',
		name: 'Apple Calendar',
		description: 'See your events in Apple Calendar',
		badge: 'connected',
		Icon: Calendar,
		tileBgClass: 'bg-foreground/5',
		tileTextClass: 'text-foreground',
	},
	{
		id: 'apple-reminders',
		name: 'Apple Reminders',
		description: 'See your reminders and tasks in Apple Reminders',
		badge: 'connected',
		Icon: ClipboardList,
		tileBgClass: 'bg-foreground/5',
		tileTextClass: 'text-foreground',
	},
	{
		id: 'gmail',
		name: 'Gmail',
		description: 'Read and send email in Gmail',
		Icon: Mail,
		tileBgClass: 'bg-red-500/15',
		tileTextClass: 'text-red-500',
		accounts: [
			{
				id: 'gmail-personal',
				email: 'tocanoctavian@gmail.com',
				subtitle: 'tocanoctavian@gmail.com',
				status: 'connected',
			},
			{
				id: 'gmail-work',
				email: 'octavian.tocan@thirdear.ai',
				subtitle: 'octavian.tocan@thirdear.ai',
				status: 'expired',
			},
		],
	},
	{
		id: 'google-calendar',
		name: 'Google Calendar',
		description:
			'Manage and see your calendar events and appointments through Google Calendar.',
		Icon: Calendar,
		tileBgClass: 'bg-blue-500/15',
		tileTextClass: 'text-blue-500',
		accounts: [
			{
				id: 'gcal-personal',
				email: 'tocanoctavian@gmail.com',
				subtitle: 'tocanoctavian@gmail.com',
				status: 'connected',
			},
			{
				id: 'gcal-work',
				email: 'octavian.tocan@thirdear.ai',
				subtitle: 'octavian.tocan@thirdear.ai',
				status: 'expired',
				label: 'Work',
			},
		],
	},
	{
		id: 'google-drive',
		name: 'Google Drive',
		description: 'Access and organize Google Drive files',
		badge: 'connected',
		Icon: FolderOpen,
		tileBgClass: 'bg-green-500/15',
		tileTextClass: 'text-green-500',
	},
];

/** Catalog rendered inside the "Add integration" modal grid. */
export interface CatalogIntegration extends IntegrationDef {
	/** "connect" → CTA button shown; otherwise pre-installed (gear). */
	state: 'installed' | 'connectable';
}

/**
 * Larger catalog of available integrations the user can browse + connect
 * from the Add Integration modal. Mix of pre-installed (Apple, Gmail,
 * Google Drive, Google Calendar) and connectable third-party tools.
 */
export const INTEGRATION_CATALOG: CatalogIntegration[] = [
	...YOUR_INTEGRATIONS.map(
		(integration): CatalogIntegration => ({ ...integration, state: 'installed' })
	),
	{
		id: 'outlook',
		name: 'Outlook',
		description: 'Manage email and calendar in Outlook',
		Icon: Mail,
		tileBgClass: 'bg-sky-500/15',
		tileTextClass: 'text-sky-500',
		state: 'connectable',
	},
	{
		id: 'adisinsight',
		name: 'AdisInsight',
		description: 'Pharmaceutical drug & clinical trial intelligence',
		Icon: Globe,
		tileBgClass: 'bg-foreground/5',
		tileTextClass: 'text-foreground',
		state: 'connectable',
	},
	{
		id: 'ahrefs',
		name: 'Ahrefs',
		description: 'SEO & AI search analytics',
		Icon: Globe,
		tileBgClass: 'bg-blue-500/15',
		tileTextClass: 'text-blue-500',
		state: 'connectable',
	},
	{
		id: 'airops',
		name: 'AirOps',
		description: 'AI workflows + agents',
		Icon: FileSpreadsheet,
		tileBgClass: 'bg-purple-500/15',
		tileTextClass: 'text-purple-500',
		state: 'connectable',
	},
	{
		id: 'airwallex',
		name: 'Airwallex Developer',
		description: 'Global business banking + payments',
		Icon: FileSpreadsheet,
		tileBgClass: 'bg-foreground/5',
		tileTextClass: 'text-foreground',
		state: 'connectable',
	},
];
