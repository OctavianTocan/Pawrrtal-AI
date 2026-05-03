/**
 * Authenticated app segment layout: sidebar shell and main content region.
 */

import { AppLayout } from '@/components/app-layout';

/**
 * Wraps `(app)/*` routes with the persistent {@link AppLayout} chrome.
 */
export default function AppLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AppLayout>{children}</AppLayout>
    </>
  );
}
