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
import { ChatActivityProvider } from '@/features/nav-chats/chat-activity-context';
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

const COLLAPSE_ANIMATION_DURATION_MS = 250;

function SidebarFocusShell({ children, className }: { children: React.ReactNode; className?: string }) {
  const { zoneRef } = useFocusZone({
    zoneId: 'sidebar',
    focusFirst: () => {
      const root = zoneRef.current;
      const target = root?.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');
      target?.focus();
    },
  });

  return (
    <div ref={zoneRef} className={className} data-focus-zone="sidebar">
      {children}
    </div>
  );
}

function ChatFocusShell({ children }: { children: React.ReactNode }) {
  const { zoneRef } = useFocusZone({
    zoneId: 'chat',
    focusFirst: () => {
      const root = zoneRef.current;
      const target = root?.querySelector<HTMLElement>('textarea, [role="textbox"], button, [tabindex]:not([tabindex="-1"])');
      target?.focus();
    },
  });

  return (
    <div ref={zoneRef} className="h-full outline-none" data-focus-zone="chat" tabIndex={-1}>
      {children}
    </div>
  );
}

function ResizableSidebarContent({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isMobile, state, setState, desktopWidth, setDesktopWidth } = useSidebar();
  const panelGroupId = React.useId();
  const sidebarPanelRef = usePanelRef();
  const isAnimatingRef = React.useRef(false);

  React.useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    if (state === 'collapsed' && !panel.isCollapsed()) {
      isAnimatingRef.current = true;
      panel.collapse();
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
          if (!isAnimatingRef.current) {
            if (size.inPixels === 0 && state !== 'collapsed') {
              setState('collapsed');
            } else if (size.inPixels > 0 && state !== 'expanded') {
              setState('expanded');
            }
          }
          if (size.inPixels > 0) {
            setDesktopWidth(size.inPixels);
          }
        }}
      >
        <SidebarFocusShell
          className="bg-sidebar text-sidebar-foreground flex h-full min-w-[240px] flex-col overflow-hidden"
        >
          <div
            style={{
              opacity: state === 'collapsed' ? 0 : 1,
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
