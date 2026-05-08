
import {
	DropdownContextMenu,
	DropdownContextMenuContent,
	DropdownContextMenuTrigger,
	DropdownMenuItem,
} from '@octavian-tocan/react-dropdown';
import { AppWindow } from 'lucide-react';
import { useRouter } from '@/lib/navigation';
import { SquarePenRounded } from '@/components/icons/SquarePenRounded';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * "New Session" header button with context menu and tooltip.
 *
 * Uses theme `rounded-soft` (8px) — rounder than form `rounded-control` (6px),
 * tighter than card `rounded-surface-lg` (14px).
 *
 * Left-click navigates to the root page (creating a fresh conversation).
 * Right-click opens a context menu with an "Open in New Window" option.
 * Hover shows a ⌘N keyboard shortcut hint via tooltip.
 *
 * Extracted as a standalone component for reusability — the same
 * button pattern can appear in the sidebar header, command palette, etc.
 */
export function NewSessionButton(): React.JSX.Element {
	const router = useRouter();
	const { isMobile, setOpenMobile } = useSidebar();

	/** Navigates to the root page, which generates a fresh conversation UUID. */
	const handleNewConversation = (): void => {
		if (isMobile) {
			setOpenMobile(false);
		}
		router.push('/');
	};

	return (
		<Tooltip>
			<DropdownContextMenu>
				<TooltipTrigger asChild>
					<DropdownContextMenuTrigger asChild>
						<Button
							variant="ghost"
							type="button"
							onClick={handleNewConversation}
							className="w-full justify-start gap-2 py-[7px] px-2 text-[13px] font-normal rounded-soft shadow-minimal bg-background"
							aria-label="New Session"
						>
							<SquarePenRounded className="h-3.5 w-3.5 shrink-0" />
							New Session
						</Button>
					</DropdownContextMenuTrigger>
				</TooltipTrigger>
				<DropdownContextMenuContent>
					<DropdownMenuItem
						onSelect={() => {
							if (typeof window !== 'undefined') {
								window.open('/', '_blank', 'noopener,noreferrer');
							}
						}}
					>
						<AppWindow className="h-3.5 w-3.5" />
						<span className="flex-1">Open in New Window</span>
					</DropdownMenuItem>
				</DropdownContextMenuContent>
			</DropdownContextMenu>
			<TooltipContent side="right">⌘N</TooltipContent>
		</Tooltip>
	);
}
