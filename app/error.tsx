"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app] render failed:", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <span className="font-mono-tag text-[10px] uppercase tracking-widest text-ink/45">
        Error · 500
      </span>
      <h1
        className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-[0.95] tracking-[-0.04em] text-ink"
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
      >
        The forge <span className="text-ember">stuttered.</span>
      </h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-ink/65">
        An unexpected error occurred. Try again in a moment. If it keeps
        happening, the team has been notified.
      </p>
      <Button onClick={reset} className="mt-8 h-12 rounded-full px-6">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  )
}
