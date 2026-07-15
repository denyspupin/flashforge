"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useThemeStore } from "@/stores"
import type { Theme } from "@/lib/constants"
import { forceLightOnDocument, isAlwaysLightPath } from "@/lib/theme"

type ThemeSyncProps = {
  initialTheme: Theme
}

export function ThemeSync({ initialTheme }: ThemeSyncProps) {
  const setPreference = useThemeStore((s) => s.setPreference)
  const pathname = usePathname()

  useEffect(() => {
    if (isAlwaysLightPath(pathname)) {
      forceLightOnDocument()
      return
    }
    setPreference(initialTheme, { persist: false })
  }, [pathname, initialTheme, setPreference])

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (isAlwaysLightPath(window.location.pathname)) return
      useThemeStore.getState().syncSystemChange()
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (isAlwaysLightPath(pathname)) return
    useThemeStore.getState().syncFromStorage()
  }, [pathname])

  return null
}
