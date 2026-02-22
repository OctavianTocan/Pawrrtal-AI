import { NavChats } from "./nav-chats";
import { Separator } from "./ui/separator";
import { Sidebar, SidebarContent, SidebarInset, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import Link from "next/link";

export function NewSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarContent>
          {/* New Conversation Button */}
          <SidebarMenuItem>
            <SidebarMenuButton>
              {/* Using link for soft navigation. */}
              <Link href={"/"}>
                <span>New Conversation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Chat History */}
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
        {/* -- PAGE LAYOUT -- */}
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
