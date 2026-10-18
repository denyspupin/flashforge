"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useState } from "react"
import { ThemeColorSync } from "@/components/theme/theme-color-sync"
import { ThemeSync } from "@/components/theme/theme-sync"
import { Toaster } from "@/components/toast"
import { toast } from "@/stores"
import type { Theme } from "@/lib/constants"

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then((m) => ({
      default: m.ReactQueryDevtools,
    })),
  { ssr: false }
)

export default function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme: Theme
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
          },
        },
      })
  )

  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    Object.assign(window, {
      toastSuccess: toast.success,
      toastError: toast.error,
      toastInfo: toast.info,
    })
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync initialTheme={initialTheme} />
      <ThemeColorSync />
      {children}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
