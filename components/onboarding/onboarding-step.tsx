"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type OnboardingStepProps = {
  icon: LucideIcon
  title: string
  description: string
  className?: string
}

export function OnboardingStep({
  icon: Icon,
  title,
  description,
  className,
}: OnboardingStepProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember/10 text-ember">
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
