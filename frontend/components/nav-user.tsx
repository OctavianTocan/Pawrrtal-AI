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

import { useQueryClient } from '@tanstack/react-query';
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
import { useRouter } from 'next/navigation';
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
import { useAuthedFetch } from '@/hooks/use-authed-fetch';
import { toast } from '@/lib/toast';
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
	/** Subscription tier copy ("Free", "Studio plan", "Team", etc.). */
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
	const router = useRouter();
	const fetcher = useAuthedFetch();
	const queryClient = useQueryClient();

	/**
	 * Calls the FastAPI-Users logout route, clears every cached query so
	 * the next session never sees the previous user's data, and routes to
	 * /login. The logout endpoint clears the JWT cookie server-side; the
	 * cache wipe is the client-side complement.
	 */
	const handleLogout = async (): Promise<void> => {
		try {
			await fetcher('/auth/jwt/logout', { method: 'POST' });
		} catch (error) {
			// 401 here is fine — we're logging out anyway. Anything else is
			// surfaced once but doesn't block the local cleanup.
			if (error instanceof Error && !error.message.includes('401')) {
				toast.error('Logout request failed; clearing local session.');
			}
		} finally {
			queryClient.clear();
			router.replace('/login');
		}
	};

	if (!isMobile && state === 'collapsed') return null;

	return (
		// Top border = the requested separator above the profile row.
		// Using `border-foreground/8` (faint) so it reads as a divider, not a
		// hard line. Wrapper gets its own padding instead of forcing the
		// trigger button to swallow it — this lets the trigger's hover paint
		// a clean fully-rounded pill that actually fills the visible row.
		<div className="shrink-0 border-t border-foreground/8 p-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						aria-label="Open account menu"
						className={cn(
							'group flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-left',
							'transition-[background-color,color] duration-150',
							'hover:bg-foreground/[0.07] aria-expanded:bg-foreground/[0.09]',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
						)}
						type="button"
					>
						<Avatar className="size-7 shrink-0">
							{user.avatar ? <AvatarImage alt={user.name} src={user.avatar} /> : null}
							<AvatarFallback className="text-xs">
								{getInitials(user.name)}
							</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col leading-tight">
							<span className="truncate text-sm font-medium text-foreground">
								{user.name}
							</span>
							<span className="truncate text-sm text-muted-foreground">
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

					<DropdownMenuItem onSelect={() => router.push('/settings')}>
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

					<DropdownMenuItem
						className="cursor-pointer"
						onSelect={(event) => {
							event.preventDefault();
							void handleLogout();
						}}
					>
						<LogOutIcon aria-hidden="true" />
						Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
