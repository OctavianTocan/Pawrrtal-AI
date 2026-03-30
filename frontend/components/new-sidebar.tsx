/**
 * Application sidebar with resizable desktop layout.
 *
 * Wraps the main sidebar component with a ResizablePanel on desktop for user-controlled
 * width adjustment. On mobile, renders as a standard sheet overlay. Includes navigation
 * chats and new session button in the sidebar content.
 *
 * @fileoverview Main app sidebar with desktop resize support
 */

'use client';

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
  const { isMobile, state, setDesktopWidth } = useSidebar();

  if (isMobile) {
    return <>{children}</>;
  }

  const isCollapsed = state === 'collapsed';

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: auto-save storage key
    <ResizablePanelGroup direction="horizontal" id="sidebar_width" className="flex-1">
      <ResizablePanel
        defaultSize={300}
        minSize={240}
        maxSize={420}
        collapsible={true}
        collapsedSize={0}
        onResize={(size) => {
          setDesktopWidth(size.inPixels);
        }}
        className={`transition-all duration-200 ease-linear ${isCollapsed ? '!hidden' : ''}`}
      >
        <Sidebar variant="inset" className="!w-full h-full border-r-0">
          <SidebarHeader className="px-2 pb-2 shrink-0">
            <NewSessionButton />
          </SidebarHeader>
          <SidebarContent>
            <NavChats />
          </SidebarContent>
        </Sidebar>
      </ResizablePanel>

      {!isCollapsed && (
        <ResizableHandle className="w-1 hover:w-2 transition-all hover:bg-sidebar-border bg-transparent" />
      )}

      <ResizablePanel className="h-full">{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
}

/**
 * Main application sidebar with resizable desktop layout and mobile sheet.
 * Provides navigation, session management, and user-controlled width on desktop.
 */
export function NewSidebar({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SidebarProvider>
      <ResizableSidebarContent>
        <SidebarInset className="peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm border border-transparent shadow-none !m-0 !rounded-none">
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
