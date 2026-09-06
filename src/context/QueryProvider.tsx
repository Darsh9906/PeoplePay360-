"use client"

import React, { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: "always",
            staleTime: 30_000,
            gcTime: 5 * 60 * 1000,
            retry: (failureCount, error) => {
              if (failureCount >= 2) return false
              const msg = error?.message?.toLowerCase() ?? ""
              if (msg.includes("401") || msg.includes("403") || msg.includes("404") || msg.includes("unauthorized")) {
                return false
              }
              return true
            },
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
