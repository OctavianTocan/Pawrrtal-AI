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

import type { MenuItemDef } from '@octavian-tocan/react-dropdown';
import { DropdownMenuDef } from '@octavian-tocan/react-dropdown';
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
import { useCallback, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

/** Stub for menu items whose actions are not yet implemented. */
function noop(): void {
	// Intentionally empty — placeholder for unimplemented menu actions.
}

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
 * Stays mounted while the sidebar is collapsing so the user chip rides
 * the slide animation out to the left along with the rest of the
 * sidebar contents. The previous early-return-on-collapse caused the
 * chip to vanish the instant the user clicked the toggle, before the
 * 200ms slide had even started — visually jarring.
 *
 * @param user - Identity rendered in the trigger and dropdown header.
 */
export function NavUser({ user }: { user: NavUserIdentity }): React.JSX.Element {
	const router = useRouter();
	const fetcher = useAuthedFetch();
	const queryClient = useQueryClient();
	// Tracks dropdown open state so we can apply the active background on the
	// trigger button — replaces Radix's automatic `aria-expanded` Tailwind variant.
	const [isOpen, setIsOpen] = useState(false);

	/**
	 * Calls the FastAPI-Users logout route, clears every cached query so
	 * the next session never sees the previous user's data, and routes to
	 * /login. The logout endpoint clears the JWT cookie server-side; the
	 * cache wipe is the client-side complement.
	 *
	 * Wrapped in useCallback so `menuItems` can declare it as a dependency
	 * without recreating the items array on every render.
	 */
	const handleLogout = useCallback(async (): Promise<void> => {
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
	}, [fetcher, queryClient, router]);

	const menuItems = useMemo<readonly MenuItemDef[]>(
		() => [
			{ type: 'label', text: user.email },
			{
				type: 'action',
				id: 'settings',
				label: 'Settings',
				icon: <SettingsIcon aria-hidden="true" className="size-4" />,
				shortcut: '⇧⌘,',
				onClick: () => router.push('/settings'),
			},
			{
				type: 'submenu',
				id: 'language',
				label: 'Language',
				icon: <GlobeIcon aria-hidden="true" className="size-4" />,
				children: LANGUAGE_OPTIONS.map((opt) => ({
					type: 'action' as const,
					id: opt.id,
					label: opt.label,
					onClick: noop,
				})),
			},
			{
				type: 'action',
				id: 'help',
				label: 'Get help',
				icon: <HelpCircleIcon aria-hidden="true" className="size-4" />,
				onClick: noop,
			},
			{ type: 'separator' },
			{
				type: 'action',
				id: 'plans',
				label: 'View all plans',
				icon: <LayoutGridIcon aria-hidden="true" className="size-4" />,
				onClick: noop,
			},
			{
				type: 'action',
				id: 'apps',
				label: 'Get apps and extensions',
				icon: <DownloadIcon aria-hidden="true" className="size-4" />,
				onClick: noop,
			},
			{
				type: 'action',
				id: 'gift',
				label: 'Gift AI Nexus',
				icon: <GiftIcon aria-hidden="true" className="size-4" />,
				onClick: noop,
			},
			{
				type: 'submenu',
				id: 'learn-more',
				label: 'Learn more',
				icon: <InfoIcon aria-hidden="true" className="size-4" />,
				children: LEARN_MORE_LINKS.map((link) => ({
					type: 'action' as const,
					id: link.id,
					label: link.label,
					onClick: noop,
				})),
			},
			{ type: 'separator' },
			{
				type: 'action',
				id: 'logout',
				label: 'Log out',
				icon: <LogOutIcon aria-hidden="true" className="size-4" />,
				onClick: () => {
					void handleLogout();
				},
			},
		],
		[user.email, router, handleLogout]
	);

	const trigger = (
		<div
			className={cn(
				'group flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-left',
				'transition-[background-color,color] duration-150',
				'hover:bg-foreground/[0.07]',
				isOpen && 'bg-foreground/[0.09]',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
			)}
		>
			<Avatar className="size-7 shrink-0">
				{user.avatar ? <AvatarImage alt={user.name} src={user.avatar} /> : null}
				<AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col leading-tight">
				<span className="truncate text-sm font-medium text-foreground">{user.name}</span>
				<span className="truncate text-sm text-muted-foreground">{user.plan}</span>
			</div>
			<ChevronsUpDownIcon
				aria-hidden="true"
				className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
			/>
		</div>
	);

	// Desktop relies on the parent `<ResizablePanel>`'s `overflow:hidden`
	// to clip the chip out as the panel slides to zero width — keeping
	// the component mounted lets it participate in the slide animation
	// instead of disappearing instantly.
	return (
		// Top border = the requested separator above the profile row.
		// Using `border-foreground/8` (faint) so it reads as a divider, not a
		// hard line. Wrapper gets its own padding instead of forcing the
		// trigger button to swallow it — this lets the trigger's hover paint
		// a clean fully-rounded pill that actually fills the visible row.
		<div className="shrink-0 border-t border-foreground/8 p-2">
			<DropdownMenuDef
				trigger={trigger}
				items={menuItems}
				placement="top"
				usePortal
				// `popover-styled` provides the project's themed background,
				// border, layered shadow, and (after the motion overhaul)
				// global backdrop-filter blur. Without it the consumer's
				// className REPLACES the package's `bg-white` default and the
				// dropdown renders transparent — letting the sidebar bleed
				// through. The `min-w-[var(--radix-dropdown-menu-trigger-width)]`
				// constraint that used to live here was dead code: the variable
				// is Radix-only, never set by our package.
				contentClassName="popover-styled p-1 w-64"
				onOpenChange={setIsOpen}
			/>
		</div>
	);
}
