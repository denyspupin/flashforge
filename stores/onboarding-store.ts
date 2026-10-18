import { create } from "zustand"

import { ONBOARDING } from "@/lib/constants"

type OnboardingState = {
  stepIndex: number
  isOpen: boolean
  hasStarted: boolean

  start: (userId: string) => void
  next: () => void
  prev: () => void
  goTo: (index: number) => void
  skip: () => void
  complete: () => void
  reset: () => void
}

const initial = {
  stepIndex: 0,
  isOpen: false,
  hasStarted: false,
}

const TOTAL_STEPS = ONBOARDING.STEPS.length

function shownKey(userId: string) {
  return `${ONBOARDING.STORAGE_KEY}:${userId}`
}

function hasShownTo(userId: string) {
  if (typeof window === "undefined") return true
  try {
    return localStorage.getItem(shownKey(userId)) === "1"
  } catch {
    return true
  }
}

function markShown(userId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(shownKey(userId), "1")
  } catch {
    // ignore quota / disabled
  }
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initial,

  start: (userId) => {
    if (hasShownTo(userId)) return
    markShown(userId)
    set({ stepIndex: 0, isOpen: true, hasStarted: true })
  },

  next: () => {
    set((s) =>
      s.stepIndex < TOTAL_STEPS - 1 ? { stepIndex: s.stepIndex + 1 } : s
    )
  },

  prev: () => {
    set((s) => (s.stepIndex > 0 ? { stepIndex: s.stepIndex - 1 } : s))
  },

  goTo: (index) => {
    set((s) => (index >= 0 && index < TOTAL_STEPS ? { stepIndex: index } : s))
  },

  skip: () => set({ ...initial }),

  complete: () => set({ ...initial }),

  reset: () => set({ ...initial }),
}))
