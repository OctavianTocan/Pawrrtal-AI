'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type * as React from 'react';
import { Toaster } from 'sonner';
import { AppearanceProvider } from '@/features/appearance';
import { getQueryClient } from './get-query-client';

/**
 * Providers is a React component that provides the query client to the application.
 * It is used to wrap the application in a query client provider.
 *
 * Also mounts the global `Toaster` once at the root so any feature can call
 * `toast.success(...)` from `@/lib/toast` without re-mounting locally, plus
 * the `AppearanceProvider` which writes the resolved per-user theme tokens
 * onto the `<html>` element so every surface (sidebar, chat, modals,
 * popovers) reads the same `--background` / `--accent` / `--foreground`
 * values. The provider must sit *inside* `QueryClientProvider` because it
 * reads `useAppearance()` to resolve the user's persisted overrides.
 *
 * @param children - The children to wrap in the query client provider.
 * @returns The query client provider wrapped around the children.
 */
export function Providers({ children }: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			<AppearanceProvider>{children}</AppearanceProvider>
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
