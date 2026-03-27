'use client';

import { NavChats } from './nav-chats';
import { NewSessionButton } from './new-session-button';
import { Separator } from './ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';

/**
 * Application sidebar layout wrapper.
 *
 * Renders the sidebar with a "New Session" button and conversation history,
 * alongside the main content area with a sidebar toggle and header.
 *
 * @param children - The page content to render in the main area.
 */
export function NewSidebar({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="px-2 pb-2 shrink-0">
          <NewSessionButton />
        </SidebarHeader>
        <SidebarContent>
          <NavChats />
        </SidebarContent>
      </Sidebar>
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
    </SidebarProvider>
  );
}
