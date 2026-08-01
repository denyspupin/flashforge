"use client"

import { cn } from "@/lib/utils"

type OnboardingProgressProps = {
  current: number
  total: number
  className?: string
}

export function OnboardingProgress({
  current,
  total,
  className,
}: OnboardingProgressProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === current
              ? "w-6 bg-ember"
              : i < current
                ? "w-1.5 bg-ember/40"
                : "w-1.5 bg-ink/15"
          )}
        />
      ))}
    </div>
  )
}
