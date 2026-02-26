'use client'

import type * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from './get-query-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

/**
 * Providers is a React component that provides the query client to the application.
 * It is used to wrap the application in a query client provider.
 *
 * @param children - The children to wrap in the query client provider.
 * @returns The query client provider wrapped around the children.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      {children}
    </QueryClientProvider>
  )
}
