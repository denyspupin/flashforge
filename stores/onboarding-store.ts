import { create } from "zustand"

import { ONBOARDING } from "@/lib/constants"

type OnboardingState = {
  stepIndex: number
  isOpen: boolean
  hasStarted: boolean

  start: () => void
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

type PersistedState = {
  stepIndex: number
  hasStarted: boolean
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(ONBOARDING.STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as PersistedState
    if (typeof value.stepIndex !== "number" || typeof value.hasStarted !== "boolean") return null
    return value
  } catch {
    return null
  }
}

function savePersisted(state: PersistedState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ONBOARDING.STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / disabled
  }
}

function clearPersisted() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(ONBOARDING.STORAGE_KEY)
  } catch {
    // ignore
  }
}

function persistCurrent(get: () => OnboardingState) {
  const state = get()
  if (!state.hasStarted) return
  savePersisted({
    stepIndex: state.stepIndex,
    hasStarted: state.hasStarted,
  })
}

export const useOnboardingStore = create<OnboardingState>((set, get) => {
  const apply = (partial: Partial<OnboardingState>) => {
    set(partial)
    persistCurrent(get)
  }

  return {
    ...initial,

    start: () => {
      const state = get()
      if (state.hasStarted) {
        const saved = loadPersisted()
        if (saved && saved.hasStarted) {
          set({
            stepIndex: Math.min(saved.stepIndex, TOTAL_STEPS - 1),
            isOpen: true,
            hasStarted: true,
          })
          return
        }
      }
      apply({ stepIndex: 0, isOpen: true, hasStarted: true })
    },

    next: () => {
      const state = get()
      if (state.stepIndex < TOTAL_STEPS - 1) {
        apply({ stepIndex: state.stepIndex + 1 })
      }
    },

    prev: () => {
      const state = get()
      if (state.stepIndex > 0) {
        apply({ stepIndex: state.stepIndex - 1 })
      }
    },

    goTo: (index) => {
      if (index >= 0 && index < TOTAL_STEPS) {
        apply({ stepIndex: index })
      }
    },

    skip: () => {
      clearPersisted()
      set({ ...initial })
    },

    complete: () => {
      clearPersisted()
      set({ ...initial })
    },

    reset: () => {
      clearPersisted()
      set({ ...initial })
    },
  }
})
