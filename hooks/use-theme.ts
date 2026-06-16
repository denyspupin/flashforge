"use client"

import { useThemeStore } from "@/stores"

export function useTheme() {
  const preference = useThemeStore((s) => s.preference)
  const resolved = useThemeStore((s) => s.resolved)
  const setPreference = useThemeStore((s) => s.setPreference)
  return { preference, resolved, setPreference }
}
