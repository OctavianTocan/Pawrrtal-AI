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
import { NavChats } from '@/features/nav-chats/NavChats';
import { NewSessionButton } from './new-session-button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, usePanelRef } from './ui/resizable';
import { Separator } from './ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';

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
      // Clear after CSS transition completes (200ms + buffer)
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 250);
    } else if (state === 'expanded' && panel.isCollapsed()) {
      isAnimatingRef.current = true;
      panel.expand();
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 250);
    }
  }, [state, sidebarPanelRef]);

  // Mobile: Sidebar renders as a Sheet overlay alongside main content
  if (isMobile) {
    return (
      <>
        <Sidebar>
          <SidebarHeader className="px-2 pb-2 shrink-0">
            <NewSessionButton />
          </SidebarHeader>
          <SidebarContent>
            <NavChats />
          </SidebarContent>
        </Sidebar>
        {children}
      </>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" id={panelGroupId} className="flex-1">
      <ResizablePanel
        panelRef={sidebarPanelRef}
        defaultSize={desktopWidth}
        outerStyle={{ transition: 'flex-grow 200ms ease-out' }}
        minSize={240}
        maxSize={420}
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
        {/* Render content directly — ResizablePanel handles sizing via flex,
            Sidebar's gap div + fixed positioning would conflict */}
        <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col overflow-hidden">
          <SidebarHeader className="px-2 pb-2 shrink-0">
            <NewSessionButton />
          </SidebarHeader>
          <SidebarContent>
            <NavChats />
          </SidebarContent>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel className="h-full">{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
}

/**
 * Main application layout with resizable sidebar and content area.
 * Provides full-page structure with sidebar navigation and responsive behavior.
 */
export function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}
