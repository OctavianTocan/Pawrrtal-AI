/**
 * Application layout with resizable sidebar.
 *
 * Provides the main app layout structure with a resizable sidebar on desktop and
 * a mobile-friendly sheet overlay. Integrates SidebarProvider, navigation, and
 * content area with proper responsive behavior.
 *
 * @fileoverview Main app layout with resizable sidebar support
 */

'use client';

import {
	ArrowLeftIcon,
	ArrowRightIcon,
	BookOpenIcon,
	CheckIcon,
	ChevronDownIcon,
	CircleHelpIcon,
	DatabaseIcon,
	ExternalLinkIcon,
	FolderPlusIcon,
	MessageSquareIcon,
	PlusIcon,
	SettingsIcon,
	ShieldCheckIcon,
	WorkflowIcon,
	ZapIcon,
} from 'lucide-react';
import React from 'react';
import { ChatActivityProvider } from '@/features/nav-chats/context/chat-activity-context';
import { SidebarFocusProvider, useFocusZone } from '@/features/nav-chats/context/sidebar-focus';
import { NavChats } from '@/features/nav-chats/NavChats';
import { OnboardingModal, OPEN_ONBOARDING_EVENT } from '@/features/onboarding/OnboardingModal';
import { NewSessionButton } from './new-session-button';
import { Button } from './ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, usePanelRef } from './ui/resizable';
import { Separator } from './ui/separator';
import {
	SIDEBAR_MAX_WIDTH,
	SIDEBAR_MIN_WIDTH,
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from './ui/sidebar';

/** Duration of the sidebar collapse/expand CSS transition in ms. */
const COLLAPSE_ANIMATION_DURATION_MS = 250;

const HELP_LINKS = [
	{ label: 'Sources', icon: DatabaseIcon },
	{ label: 'Skills', icon: ZapIcon },
	{ label: 'Statuses', icon: CheckIcon },
	{ label: 'Permissions', icon: ShieldCheckIcon },
	{ label: 'Automations', icon: WorkflowIcon },
	{ label: 'Messaging', icon: MessageSquareIcon },
] as const;

function handleOpenOnboarding(): void {
	window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT));
}

function AppHistoryControls(): React.JSX.Element {
	return (
		<div className="flex items-center gap-0.5">
			<Button
				aria-label="Back"
				className="size-7 cursor-pointer rounded-[7px] text-muted-foreground transition-[background-color,color] duration-150 hover:bg-foreground/[0.055] hover:text-foreground"
				size="icon-xs"
				title="Back"
				type="button"
				variant="ghost"
			>
				<ArrowLeftIcon aria-hidden="true" className="size-4" />
			</Button>
			<Button
				aria-label="Forward"
				className="size-7 cursor-pointer rounded-[7px] text-muted-foreground transition-[background-color,color] duration-150 hover:bg-foreground/[0.055] hover:text-foreground"
				size="icon-xs"
				title="Forward"
				type="button"
				variant="ghost"
			>
				<ArrowRightIcon aria-hidden="true" className="size-4" />
			</Button>
		</div>
	);
}

function WorkspaceSelector(): React.JSX.Element {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="Select workspace"
					className="h-7 gap-2 rounded-[7px] border border-foreground/10 bg-foreground/[0.03] px-2.5 text-[13px] font-normal text-foreground hover:bg-foreground/[0.06] aria-expanded:bg-foreground/[0.06]"
					type="button"
					variant="ghost"
				>
					<span className="flex size-4.5 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-medium">
						A
					</span>
					<span>AI Nexus</span>
					<ChevronDownIcon
						aria-hidden="true"
						className="size-3.5 text-muted-foreground"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-56" sideOffset={6}>
				<DropdownMenuItem className="justify-between">
					<span className="flex items-center gap-2">
						<span className="flex size-5 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-medium">
							A
						</span>
						AI Nexus
					</span>
					<CheckIcon aria-hidden="true" className="size-3.5 text-foreground" />
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={handleOpenOnboarding}>
					<FolderPlusIcon aria-hidden="true" className="size-3.5" />
					Add Workspace...
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function HelpMenu(): React.JSX.Element {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="Open documentation menu"
					className="size-7 rounded-[7px] text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground aria-expanded:bg-foreground/[0.05]"
					size="icon-xs"
					type="button"
					variant="ghost"
				>
					<CircleHelpIcon aria-hidden="true" className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56" sideOffset={8}>
				{HELP_LINKS.map((link) => {
					const Icon = link.icon;

					return (
						<DropdownMenuItem className="justify-between" key={link.label}>
							<span className="flex items-center gap-2">
								<Icon aria-hidden="true" className="size-3.5" />
								{link.label}
							</span>
							<ExternalLinkIcon
								aria-hidden="true"
								className="size-3.5 text-muted-foreground"
							/>
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<BookOpenIcon aria-hidden="true" className="size-3.5" />
					All Documentation
				</DropdownMenuItem>
				<DropdownMenuItem>
					<SettingsIcon aria-hidden="true" className="size-3.5" />
					Keyboard Shortcuts
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * Wraps sidebar content in a focus zone so keyboard navigation (Tab/Shift+Tab)
 * can jump directly to the sidebar region instead of walking every focusable element.
 * Focuses the first interactive child (input or button) when the zone receives focus.
 */
function SidebarFocusShell({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}): React.JSX.Element {
	const { zoneRef } = useFocusZone({
		zoneId: 'sidebar',
		focusFirst: () => {
			const root = zoneRef.current;
			const target = root?.querySelector<HTMLElement>(
				'input, button, [tabindex]:not([tabindex="-1"])'
			);
			target?.focus();
		},
	});

	return (
		// No tabIndex needed: focus-zone entry delegates to the first interactive
		// child (input or button) via focusFirst, so the shell itself is never a
		// focus target. ChatFocusShell uses tabIndex={-1} because its focusFirst
		// targets a specific textarea/textbox — the shell div is the fallback.
		<div ref={zoneRef} className={className} data-focus-zone="sidebar">
			{children}
		</div>
	);
}

/**
 * Wraps the chat panel in a focus zone so keyboard navigation can jump
 * directly into the chat area. Targets the textarea or textbox first,
 * falling back to any focusable element.
 */
function ChatFocusShell({ children }: { children: React.ReactNode }): React.JSX.Element {
	const { zoneRef } = useFocusZone({
		zoneId: 'chat',
		focusFirst: () => {
			const root = zoneRef.current;
			const target = root?.querySelector<HTMLElement>(
				'textarea, [role="textbox"], button, [tabindex]:not([tabindex="-1"])'
			);
			target?.focus();
		},
	});

	return (
		// outline-none is safe: this div only receives focus programmatically via
		// focusZone('chat'), which immediately forwards to the textarea/textbox child.
		// Users never see keyboard focus land here.
		<div
			ref={zoneRef}
			className="h-full min-w-0 outline-none"
			data-focus-zone="chat"
			tabIndex={-1}
		>
			{children}
		</div>
	);
}

/**
 * Sidebar content wrapper with conditional resizable layout.
 * Renders resizable panels on desktop, plain content on mobile.
 */
function ResizableSidebarContent({ children }: { children: React.ReactNode }): React.JSX.Element {
	const { isMobile, state, setState, desktopWidth, isDesktopWidthReady, setDesktopWidth } =
		useSidebar();
	const panelGroupId = React.useId();
	const sidebarPanelRef = usePanelRef();
	const [isSidebarTransitioning, setIsSidebarTransitioning] = React.useState(false);
	const [initialPanelSize, setInitialPanelSize] = React.useState(desktopWidth);

	// Guards onResize from syncing state while a programmatic collapse/expand
	// animation is in-flight — without this, ResizeObserver fires intermediate
	// sizes during the CSS flex-grow transition, causing a feedback loop that
	// fights the collapse/expand.
	const isAnimatingRef = React.useRef(false);
	const didSyncInitialPanelSizeRef = React.useRef(false);
	const transitionTimeoutRef = React.useRef<number | null>(null);

	const beginProgrammaticResize = React.useCallback((resizePanel: () => void): void => {
		if (transitionTimeoutRef.current !== null) {
			window.clearTimeout(transitionTimeoutRef.current);
		}

		isAnimatingRef.current = true;
		setIsSidebarTransitioning(true);

		window.requestAnimationFrame(() => {
			resizePanel();
			transitionTimeoutRef.current = window.setTimeout(() => {
				isAnimatingRef.current = false;
				setIsSidebarTransitioning(false);
				transitionTimeoutRef.current = null;
			}, COLLAPSE_ANIMATION_DURATION_MS);
		});
	}, []);

	React.useEffect(() => {
		return () => {
			if (transitionTimeoutRef.current !== null) {
				window.clearTimeout(transitionTimeoutRef.current);
			}
		};
	}, []);

	React.useLayoutEffect(() => {
		if (!isDesktopWidthReady || didSyncInitialPanelSizeRef.current) {
			return;
		}

		didSyncInitialPanelSizeRef.current = true;
		setInitialPanelSize(desktopWidth);
	}, [desktopWidth, isDesktopWidthReady]);

	// Drive the panel's collapse/expand from the sidebar context state
	// so that the toggle button, keyboard shortcut, etc. all work through
	// the library's layout engine (smooth flex transitions) instead of CSS display:none.
	React.useEffect(() => {
		const panel = sidebarPanelRef.current;
		if (!panel) return;

		if (state === 'collapsed' && !panel.isCollapsed()) {
			beginProgrammaticResize(() => panel.collapse());
		} else if (state === 'expanded' && panel.isCollapsed()) {
			beginProgrammaticResize(() => panel.expand());
		}
	}, [beginProgrammaticResize, state, sidebarPanelRef]);

	// Mobile: Sidebar renders as a Sheet overlay alongside main content
	if (isMobile) {
		return (
			<>
				<Sidebar>
					<SidebarFocusShell className="flex h-full flex-col">
						<SidebarHeader className="px-2 pb-2 shrink-0">
							<NewSessionButton />
						</SidebarHeader>
						<SidebarContent>
							<NavChats />
						</SidebarContent>
					</SidebarFocusShell>
				</Sidebar>
				<ChatFocusShell>{children}</ChatFocusShell>
			</>
		);
	}

	return (
		<ResizablePanelGroup
			direction="horizontal"
			id={panelGroupId}
			className="min-h-0 min-w-0 flex-1"
		>
			<ResizablePanel
				panelRef={sidebarPanelRef}
				defaultSize={initialPanelSize}
				outerStyle={{
					transition: isSidebarTransitioning ? 'flex-grow 200ms ease-out' : undefined,
				}}
				style={{ overflow: 'hidden' }}
				minSize={SIDEBAR_MIN_WIDTH}
				maxSize={SIDEBAR_MAX_WIDTH}
				collapsible={true}
				collapsedSize={0}
				onResize={(size) => {
					// Skip state sync during programmatic collapse/expand animation
					// to prevent ResizeObserver intermediate values from fighting the transition
					if (!isAnimatingRef.current) {
						if (size.inPixels === 0 && state !== 'collapsed') {
							setState('collapsed');
						} else if (size.inPixels > 0 && state !== 'expanded') {
							setState('expanded');
						}
					}
					// Always persist non-zero widths
					if (size.inPixels > 0) {
						setDesktopWidth(size.inPixels);
					}
				}}
			>
				{/* Content keeps min-width so layout never reflows during collapse —
          the panel clips via overflow:hidden and the content fades out. */}
				<SidebarFocusShell className="bg-sidebar text-sidebar-foreground flex h-full min-w-[240px] flex-col overflow-hidden">
					<div
						style={{
							opacity: state === 'collapsed' ? 0 : 1,
							// Disable pointer events when invisible to prevent click-dead-zones
							// per the hidden-overlay-pointer-events rule.
							pointerEvents: state === 'collapsed' ? 'none' : 'auto',
							transition: 'opacity 150ms ease-out',
						}}
						className="flex h-full min-w-[240px] flex-col overflow-hidden"
					>
						<SidebarHeader className="px-2 pb-2 shrink-0">
							<NewSessionButton />
						</SidebarHeader>
						<SidebarContent>
							<NavChats />
						</SidebarContent>
					</div>
				</SidebarFocusShell>
			</ResizablePanel>

			<ResizableHandle />

			<ResizablePanel className="h-full min-w-0">
				<ChatFocusShell>{children}</ChatFocusShell>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

/**
 * Main application layout with resizable sidebar and content area.
 * Provides full-page structure with sidebar navigation and responsive behavior.
 * Wraps everything in focus-zone and chat-activity providers.
 */
export function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
	return (
		<SidebarProvider>
			<SidebarFocusProvider>
				<ChatActivityProvider>
					<div className="flex h-svh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
						<OnboardingModal initialOpen={false} />
						<header className="flex h-9 shrink-0 items-center bg-background/95 px-3">
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<SidebarTrigger className="cursor-pointer" />
								<AppHistoryControls />
								<Separator
									orientation="vertical"
									className="ml-1 data-vertical:h-4 data-vertical:self-auto"
								/>
								<WorkspaceSelector />
								<div className="ml-auto flex items-center gap-1">
									<Button
										aria-label="Create new item"
										className="size-7 rounded-[7px] text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
										size="icon-xs"
										type="button"
										variant="ghost"
									>
										<PlusIcon aria-hidden="true" className="size-4" />
									</Button>
									<Separator
										orientation="vertical"
										className="mx-1 data-vertical:h-4 data-vertical:self-auto"
									/>
									<HelpMenu />
								</div>
							</div>
						</header>
						<div className="flex min-h-0 min-w-0 flex-1">
							<ResizableSidebarContent>
								<SidebarInset className="h-full min-h-0 min-w-0">
									<div className="min-h-0 min-w-0 flex-1">{children}</div>
								</SidebarInset>
							</ResizableSidebarContent>
						</div>
					</div>
				</ChatActivityProvider>
			</SidebarFocusProvider>
		</SidebarProvider>
	);
}
