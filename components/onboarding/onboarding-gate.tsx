"use client"

import { useEffect } from "react"

import { useOnboardingStore } from "@/stores/onboarding-store"
import { OnboardingDialog } from "./onboarding-dialog"

type OnboardingGateProps = {
  onboarded: boolean
}

export function OnboardingGate({ onboarded }: OnboardingGateProps) {
  const start = useOnboardingStore((s) => s.start)

  useEffect(() => {
    if (!onboarded) {
      start()
    }
  }, [onboarded, start])

  if (onboarded) return null

  return <OnboardingDialog />
}
