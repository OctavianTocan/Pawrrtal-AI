'use client';

import type * as React from 'react';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { NavChats } from '@/features/nav-chats/NavChats';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarContent>
        <NavChats />
      </SidebarContent>
    </Sidebar>
  );
}
