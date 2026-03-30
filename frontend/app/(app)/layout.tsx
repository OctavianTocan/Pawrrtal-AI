import { NewSidebar } from '@/components/new-sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <NewSidebar>{children}</NewSidebar>
    </>
  );
}
