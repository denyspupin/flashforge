import { create } from "zustand"
import { DEFAULT_THEME, type Theme } from "@/lib/constants"
import {
  applyThemeToDocument,
  readSystemColorScheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme"

type ThemeState = {
  preference: Theme
  resolved: "light" | "dark"
  setPreference: (next: Theme, options?: { persist?: boolean }) => void
  syncFromStorage: () => void
  syncSystemChange: () => void
}

function readPersistedPreference(): Theme | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === "light" || raw === "dark" || raw === "system") return raw
  } catch {
    // ignore
  }
  return null
}

function writePersistedPreference(value: Theme) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: DEFAULT_THEME,
  resolved: "light",

  setPreference: (next, options) => {
    const persist = options?.persist !== false
    if (persist) writePersistedPreference(next)
    const resolved = applyThemeToDocument(next, readSystemColorScheme())
    set({ preference: next, resolved })
  },

  syncFromStorage: () => {
    const stored = readPersistedPreference()
    if (!stored) return
    const current = get().preference
    if (stored === current) return
    const resolved = applyThemeToDocument(stored, readSystemColorScheme())
    set({ preference: stored, resolved })
  },

  syncSystemChange: () => {
    const { preference } = get()
    if (preference !== "system") return
    const resolved = applyThemeToDocument(preference, readSystemColorScheme())
    set({ resolved })
  },
}))
