"use client"

import { useEffect } from "react"
import { useThemeStore } from "@/stores"
import type { Theme } from "@/lib/constants"

type ThemeSyncProps = {
  initialTheme: Theme
}

export function ThemeSync({ initialTheme }: ThemeSyncProps) {
  const setPreference = useThemeStore((s) => s.setPreference)

  useEffect(() => {
    setPreference(initialTheme, { persist: false })
  }, [initialTheme, setPreference])

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => useThemeStore.getState().syncSystemChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    useThemeStore.getState().syncFromStorage()
  }, [])

  return null
}
