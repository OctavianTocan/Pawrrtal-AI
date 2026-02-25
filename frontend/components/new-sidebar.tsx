"use client";
import { NavChats } from "./nav-chats";
import { Separator } from "./ui/separator";
import { Sidebar, SidebarContent, SidebarInset, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "./ui/sidebar";
import { useRouter } from "next/navigation";

export function NewSidebar({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Handle new conversation. We need to replace the current URL with the root URL, and then refresh the page to get the new conversation. (We don't use a link, because we want to avoid reloading the page and losing the chat history).
  const handleNewConversation = () => {
    // window.history.replaceState(null, "", "/");
    // router.refresh();
    router.push("/");
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarContent>
          {/* New Conversation Button */}
          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" onClick={handleNewConversation}>
              <span>New Conversation</span>
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
