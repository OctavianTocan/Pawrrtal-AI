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

import React from 'react';
import { ChatActivityProvider } from '@/features/nav-chats/chat-activity-context';
import { NavChats } from '@/features/nav-chats/NavChats';
import { SidebarFocusProvider, useFocusZone } from '@/features/nav-chats/sidebar-focus';
import { NewSessionButton } from './new-session-button';
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
}) {
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
function ChatFocusShell({ children }: { children: React.ReactNode }) {
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
    <div ref={zoneRef} className="h-full outline-none" data-focus-zone="chat" tabIndex={-1}>
      {children}
    </div>
  );
}

/**
 * Sidebar content wrapper with conditional resizable layout.
 * Renders resizable panels on desktop, plain content on mobile.
 */
function ResizableSidebarContent({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isMobile, state, setState, desktopWidth, setDesktopWidth } = useSidebar();
  const panelGroupId = React.useId();
  const sidebarPanelRef = usePanelRef();

  // Guards onResize from syncing state while a programmatic collapse/expand
  // animation is in-flight — without this, ResizeObserver fires intermediate
  // sizes during the CSS flex-grow transition, causing a feedback loop that
  // fights the collapse/expand.
  const isAnimatingRef = React.useRef(false);

  // Drive the panel's collapse/expand from the sidebar context state
  // so that the toggle button, keyboard shortcut, etc. all work through
  // the library's layout engine (smooth flex transitions) instead of CSS display:none.
  React.useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    if (state === 'collapsed' && !panel.isCollapsed()) {
      isAnimatingRef.current = true;
      panel.collapse();
      // Clear after CSS transition completes
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, COLLAPSE_ANIMATION_DURATION_MS);
    } else if (state === 'expanded' && panel.isCollapsed()) {
      isAnimatingRef.current = true;
      panel.expand();
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, COLLAPSE_ANIMATION_DURATION_MS);
    }
  }, [state, sidebarPanelRef]);

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
    <ResizablePanelGroup direction="horizontal" id={panelGroupId} className="flex-1">
      <ResizablePanel
        panelRef={sidebarPanelRef}
        defaultSize={desktopWidth}
        outerStyle={{ transition: 'flex-grow 200ms ease-out' }}
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

      <ResizablePanel className="h-full">
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
          <ResizableSidebarContent>
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1 cursor-pointer" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-vertical:h-4 data-vertical:self-auto"
                  />
                </div>
              </header>
              <div className="flex-1">{children}</div>
            </SidebarInset>
          </ResizableSidebarContent>
        </ChatActivityProvider>
      </SidebarFocusProvider>
    </SidebarProvider>
  );
}
