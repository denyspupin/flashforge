"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard] render failed:", error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Couldn’t load your dashboard
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Something went wrong pulling your latest stats. Give it another try.
      </p>
      <Button onClick={reset} className="mt-6">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
