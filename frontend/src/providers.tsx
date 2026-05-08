/**
 * App-root provider tree.
 *
 * Mounts TanStack Query (with devtools) and the global Sonner toaster.
 * Used to live at `app/providers.tsx` with a `'use client'` directive
 * — the directive is gone now that there's no server / client split.
 *
 * The `<AppearanceProvider>` that used to sit here was removed as part
 * of the 2026-05-06 theming-system rip
 * (see `docs/decisions/2026-05-06-rip-theming-system.md`). The cascade
 * defaults defined in `app/globals.css` now drive the entire theme.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type * as React from 'react';
import { Toaster } from 'sonner';
import { getQueryClient } from './get-query-client';

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			{children}
			<Toaster
				closeButton
				duration={3500}
				position="top-center"
				richColors={false}
				theme="system"
				visibleToasts={3}
			/>
		</QueryClientProvider>
	);
}
