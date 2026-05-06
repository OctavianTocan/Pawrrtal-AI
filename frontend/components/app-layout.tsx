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
import { OnboardingFlow } from '@/features/onboarding/v2/OnboardingFlow';
import { useIsMacDesktop } from '@/hooks/use-is-mac-desktop';
import { cn } from '@/lib/utils';
import { NavUser, type NavUserIdentity } from './nav-user';
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

/**
 * Placeholder identity rendered in the sidebar footer.
 *
 * The frontend has no client-side auth context yet — once a `useCurrentUser`
 * (or equivalent) hook lands, replace this with the resolved value. Keeping
 * the shape declared here means swapping the source is a one-line change.
 */
const SIDEBAR_USER: NavUserIdentity = {
	name: 'Octavian Tocan',
	email: 'tocanoctavian@gmail.com',
	plan: 'Studio plan',
};

const HELP_LINKS = [
	{ label: 'Sources', icon: DatabaseIcon },
	{ label: 'Skills', icon: ZapIcon },
	{ label: 'Statuses', icon: CheckIcon },
	{ label: 'Permissions', icon: ShieldCheckIcon },
	{ label: 'Automations', icon: WorkflowIcon },
	{ label: 'Messaging', icon: MessageSquareIcon },
] as const;

/**
 * Fired by the workspace dropdown's "Add Workspace..." item. Opens the
 * three-step **workspace** onboarding modal (Welcome → Create workspace →
 * Local workspace) — NOT the home-page personalization wizard. The two
 * are distinct surfaces: workspace lives behind this dropdown, while
 * personalization fires on every fresh page load.
 */
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
 * Width reserved for the macOS traffic-light buttons (close / minimize /
 * maximize) when running in the Electron desktop shell with
 * `titleBarStyle: 'hiddenInset'`. The buttons live inside the
 * BrowserWindow content area, so the header's leftmost controls have to
 * start past them or they get drawn underneath. Apple's HIG places the
 * buttons in the first ~70px; we round up to 80px to give the
 * SidebarTrigger a comfortable gap.
 */
const MAC_TRAFFIC_LIGHT_RESERVE_PX = 80;

/**
 * Top-bar chrome rendered as a full-width overlay above the sidebar and content.
 * Lives outside the sidebar so its controls (sidebar trigger, history, workspace
 * selector) stay in their original screen positions even when the sidebar is
 * hidden — the sidebar visually extends underneath this header.
 */
function AppHeader(): React.JSX.Element {
	const isMacDesktop = useIsMacDesktop();
	return (
		<header
			className={cn(
				// On macOS the controls' vertical centerline has to match the
				// traffic-light centerline (≈14px from the window top under
				// `hiddenInset`). Header buttons are 28px tall, so anchoring
				// them to `items-start` with no top padding puts their center
				// at y=14 — flush with the system buttons. Web/Windows/Linux
				// keep the original `items-center` rhythm with `pt-1`.
				'absolute inset-x-0 top-0 z-20 flex h-10 shrink-0 border-0 pr-3 outline-none focus:outline-none focus-visible:outline-none',
				isMacDesktop ? 'items-start pt-0' : 'items-center pt-1 pl-3'
			)}
			style={isMacDesktop ? { paddingLeft: MAC_TRAFFIC_LIGHT_RESERVE_PX } : undefined}
		>
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

	// Mobile: Sidebar renders as a Sheet overlay alongside main content.
	// The Sheet portals above the absolute AppHeader, so its content does not
	// need a header offset — only the chat surface does.
	if (isMobile) {
		return (
			<>
				<Sidebar>
					<SidebarFocusShell className="flex h-full flex-col">
						<SidebarHeader className="px-2 pb-1 shrink-0">
							<NewSessionButton />
						</SidebarHeader>
						<SidebarContent>
							<NavChats />
						</SidebarContent>
						<NavUser user={SIDEBAR_USER} />
					</SidebarFocusShell>
				</Sidebar>
				<div className="h-full w-full min-w-0 pt-10">
					<ChatFocusShell>{children}</ChatFocusShell>
				</div>
			</>
		);
	}

	return (
		<ResizablePanelGroup
			direction="horizontal"
			id={panelGroupId}
			className={`min-h-0 min-w-0 flex-1 ${
				isSidebarTransitioning
					? '[&>[data-panel]:first-child]:transition-[flex-grow] [&>[data-panel]:first-child]:duration-200 [&>[data-panel]:first-child]:ease-out'
					: ''
			}`}
		>
			<ResizablePanel
				panelRef={sidebarPanelRef}
				defaultSize={initialPanelSize}
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
          the panel clips via overflow:hidden and the content slides out
          of view (no fade) as the chat panel pushes leftward to fill the
          space. Pointer events are disabled while collapsed so the
          clipped content can't capture clicks bleeding past the
          panel boundary.
          The pt-10 offsets sidebar contents so they sit below the absolute
          AppHeader; the panel itself still extends to the top of the viewport
          so the sidebar background reads as full-height behind the header. */}
				<SidebarFocusShell className="bg-sidebar text-sidebar-foreground flex h-full min-w-[240px] flex-col overflow-hidden pt-10">
					{/*
					 * Inner panel content keeps its full min-w-[240px] width
					 * and stays anchored to the LEFT edge of the parent
					 * react-resizable-panel. As the parent shrinks during a
					 * collapse, content clips from the RIGHT (the side closest
					 * to the chat panel). This matches the "the whole panel
					 * with its full size moves left and disappears off-screen"
					 * behavior described in DESIGN.md → Motion → "Sidebar Open
					 * / Close": titles stay put for the duration of the slide
					 * and only the right-side metadata gets clipped first.
					 *
					 * Pointer events are disabled while collapsed so the
					 * (clipped to 0px) panel can't capture stray clicks. We
					 * intentionally do NOT translate-x on this inner div —
					 * a translate makes the LEFT-aligned content slide off-
					 * screen first, leaving right-aligned metadata visible
					 * during the slide. That created the "chat panel
					 * approaches the row titles" creeping effect.
					 */}
					<div
						data-state={state}
						className="flex h-full min-w-[240px] flex-col overflow-hidden data-[state=collapsed]:pointer-events-none data-[state=expanded]:pointer-events-auto"
					>
						<SidebarHeader className="px-2 pb-1 shrink-0">
							<NewSessionButton />
						</SidebarHeader>
						<SidebarContent>
							<NavChats />
						</SidebarContent>
						<NavUser user={SIDEBAR_USER} />
					</div>
				</SidebarFocusShell>
			</ResizablePanel>

			{/*
			 * Constrain the handle height to match the chat panel's visible
			 * area: mt-10 aligns the top with the chat panel below the
			 * AppHeader (pt-10), mb-2 aligns the bottom with the chat
			 * panel's pb-2 gap. The flex-row Group's align:stretch default
			 * subtracts these cross-axis margins from the handle's height,
			 * so the drag affordance + ::after hit area only cover the
			 * panel boundary — not the header strip or the bottom margin.
			 */}
			<ResizableHandle className="mt-10 mb-2" />

			{/*
			 * Chat panel stacks above the sidebar via z-index so its left-edge
			 * shadow visibly casts onto the sidebar — this is what makes the
			 * panel feel like it "closes over" the sidebar when collapsing.
			 * overflow:visible lets the shadow escape the panel container
			 * (react-resizable-panels otherwise clips children to the panel
			 * box, swallowing the shadow).
			 */}
			<ResizablePanel
				className="relative z-10 h-full min-w-0"
				style={{ overflow: 'visible' }}
			>
				{/*
				 * pr-2 + pb-2 leave breathing room so the floating chat
				 * panel's right and bottom shadow layers actually paint —
				 * without this, the panel hugs the viewport edges and the
				 * shadow gets clipped against them. The left edge still
				 * butts up against the sidebar so the leftward shadow
				 * casts onto it.
				 */}
				<div className="h-full min-w-0 pt-10 pr-2 pb-2">
					<ChatFocusShell>{children}</ChatFocusShell>
				</div>
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
					{/*
					 * Root chrome uses the sidebar surface color so the area
					 * around the floating chat panel — the AppHeader strip
					 * across the top, plus the pr-2/pb-2 gap framing the
					 * panel — visually reads as one continuous "outside"
					 * surface with the sidebar. The chat panel keeps its
					 * own bg-background, so the contrast stays.
					 */}
					<div className="relative flex h-svh min-h-0 w-full min-w-0 overflow-hidden bg-sidebar">
						{/*
						 * Personalization wizard fires on every fresh page load
						 * while the feature is WIP — see DESIGN.md →
						 * Components → personalization-modal. Dismissing closes
						 * for the session only; a browser refresh re-opens it.
						 */}
						<OnboardingFlow initialOpen />
						{/*
						 * Workspace onboarding (Welcome → Create workspace →
						 * Local workspace) is event-driven only — opens when
						 * the user picks "Add Workspace..." in the workspace
						 * dropdown. Never opens automatically.
						 */}
						<OnboardingModal initialOpen={false} listenForOpenEvent />
						<ResizableSidebarContent>
							<SidebarInset className="h-full min-h-0 min-w-0">
								<div className="min-h-0 min-w-0 flex-1">{children}</div>
							</SidebarInset>
						</ResizableSidebarContent>
						<AppHeader />
					</div>
				</ChatActivityProvider>
			</SidebarFocusProvider>
		</SidebarProvider>
	);
}
