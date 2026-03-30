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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
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
  const { isMobile, state, desktopWidth, setDesktopWidth } = useSidebar();
  const panelGroupId = React.useId();

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

  const isCollapsed = state === 'collapsed';

  return (
    <ResizablePanelGroup direction="horizontal" id={panelGroupId} className="flex-1">
      <ResizablePanel
        defaultSize={desktopWidth}
        minSize={240}
        maxSize={420}
        collapsible={true}
        collapsedSize={0}
        onResize={(size) => {
          setDesktopWidth(size.inPixels);
        }}
        className={`transition-all duration-200 ease-linear ${isCollapsed ? '!hidden' : ''}`}
      >
        {/* Render content directly — ResizablePanel handles sizing via flex,
            Sidebar's gap div + fixed positioning would conflict */}
        <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
          <SidebarHeader className="px-2 pb-2 shrink-0">
            <NewSessionButton />
          </SidebarHeader>
          <SidebarContent>
            <NavChats />
          </SidebarContent>
        </div>
      </ResizablePanel>

      {!isCollapsed && (
        <ResizableHandle className="w-1 hover:w-2 transition-all hover:bg-sidebar-border bg-transparent" />
      )}

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
