/**
 * Sidebar footer user menu — avatar trigger + Claude-style account dropdown.
 *
 * Mirrors the Claude.ai sidebar pattern: a low-profile profile row anchored at
 * the bottom of the sidebar that opens a dropdown above it, with sections for
 * account preferences (Settings, Language, Help), product surfaces (plans,
 * apps, gift, learn more), and a sign-out action.
 *
 * @fileoverview Profile button + dropdown rendered as the SidebarFooter.
 */

'use client';

import {
	ChevronsUpDownIcon,
	DownloadIcon,
	GiftIcon,
	GlobeIcon,
	HelpCircleIcon,
	InfoIcon,
	LayoutGridIcon,
	LogOutIcon,
	SettingsIcon,
} from 'lucide-react';
import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/**
 * Identity rendered in the trigger and the dropdown header label.
 *
 * Kept as a plain prop bag (rather than wired to an auth hook) so the
 * component remains a presentation primitive — callers fetch the user
 * however they want and pass the resolved fields down.
 */
export type NavUserIdentity = {
	/** Display name shown on the trigger row. */
	name: string;
	/** Account email shown as the dropdown's top label. */
	email: string;
	/** Subscription tier copy ("Free", "Max plan", "Team", etc.). */
	plan: string;
	/** Optional avatar image URL; falls back to initials when missing. */
	avatar?: string;
};

const LANGUAGE_OPTIONS = [
	{ id: 'en', label: 'English' },
	{ id: 'es', label: 'Español' },
	{ id: 'fr', label: 'Français' },
	{ id: 'de', label: 'Deutsch' },
	{ id: 'ja', label: '日本語' },
] as const satisfies ReadonlyArray<{ id: string; label: string }>;

const LEARN_MORE_LINKS = [
	{ id: 'changelog', label: 'Changelog' },
	{ id: 'docs', label: 'Documentation' },
	{ id: 'community', label: 'Community' },
	{ id: 'status', label: 'Status' },
] as const satisfies ReadonlyArray<{ id: string; label: string }>;

/** First letter of each space-separated word, capped at two — for AvatarFallback. */
function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	const first = parts[0]?.[0] ?? '';
	const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
	return `${first}${second}`.toUpperCase();
}

/**
 * Sidebar profile button + account dropdown.
 *
 * Renders nothing while the desktop sidebar is collapsed — the trigger row
 * relies on having horizontal room for the name + plan label, and the
 * collapsed shell clips down to an icon rail width.
 *
 * @param user - Identity rendered in the trigger and dropdown header.
 */
export function NavUser({ user }: { user: NavUserIdentity }): React.JSX.Element | null {
	const { state, isMobile } = useSidebar();

	if (!isMobile && state === 'collapsed') return null;

	return (
		<div className="px-2 pt-1 pb-2 shrink-0">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						aria-label="Open account menu"
						className={cn(
							'group flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left',
							'transition-[background-color,color] duration-150',
							'hover:bg-foreground/[0.05] aria-expanded:bg-foreground/[0.06]',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
						)}
						type="button"
					>
						<Avatar className="size-7 shrink-0">
							{user.avatar ? <AvatarImage alt={user.name} src={user.avatar} /> : null}
							<AvatarFallback className="text-[10px]">
								{getInitials(user.name)}
							</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col leading-tight">
							<span className="truncate text-[13px] font-medium text-foreground">
								{user.name}
							</span>
							<span className="truncate text-[11px] text-muted-foreground">
								{user.plan}
							</span>
						</div>
						<ChevronsUpDownIcon
							aria-hidden="true"
							className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
						/>
					</button>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					align="start"
					className="w-64 min-w-[var(--radix-dropdown-menu-trigger-width)]"
					side="top"
					sideOffset={8}
				>
					<DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>

					<DropdownMenuItem>
						<SettingsIcon aria-hidden="true" />
						Settings
						<DropdownMenuShortcut>⇧⌘,</DropdownMenuShortcut>
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<GlobeIcon aria-hidden="true" />
							Language
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="min-w-40">
							{LANGUAGE_OPTIONS.map((option) => (
								<DropdownMenuItem key={option.id}>{option.label}</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuItem>
						<HelpCircleIcon aria-hidden="true" />
						Get help
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem>
						<LayoutGridIcon aria-hidden="true" />
						View all plans
					</DropdownMenuItem>
					<DropdownMenuItem>
						<DownloadIcon aria-hidden="true" />
						Get apps and extensions
					</DropdownMenuItem>
					<DropdownMenuItem>
						<GiftIcon aria-hidden="true" />
						Gift AI Nexus
					</DropdownMenuItem>

					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<InfoIcon aria-hidden="true" />
							Learn more
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="min-w-40">
							{LEARN_MORE_LINKS.map((link) => (
								<DropdownMenuItem key={link.id}>{link.label}</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuSeparator />

					<DropdownMenuItem>
						<LogOutIcon aria-hidden="true" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
