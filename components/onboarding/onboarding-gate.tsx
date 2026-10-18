"use client"

import { useEffect } from "react"

import { useOnboardingStore } from "@/stores/onboarding-store"
import { OnboardingDialog } from "./onboarding-dialog"

type OnboardingGateProps = {
  onboarded: boolean
  userId: string
}

export function OnboardingGate({ onboarded, userId }: OnboardingGateProps) {
  const start = useOnboardingStore((s) => s.start)

  useEffect(() => {
    if (!onboarded) {
      start(userId)
    }
  }, [onboarded, start, userId])

  if (onboarded) return null

  return <OnboardingDialog />
}
