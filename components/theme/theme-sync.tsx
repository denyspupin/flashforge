"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useThemeStore } from "@/stores"
import type { Theme } from "@/lib/constants"
import { forceLightOnDocument, isAlwaysLightPath, THEME_STORAGE_KEY } from "@/lib/theme"

type ThemeSyncProps = {
  initialTheme: Theme
}

export function ThemeSync({ initialTheme }: ThemeSyncProps) {
  const pathname = usePathname()
  const wasOnAlwaysLightPath = useRef(true)

  useEffect(() => {
    const isAlwaysLight = isAlwaysLightPath(pathname)
    
    if (isAlwaysLight) {
      forceLightOnDocument()
      wasOnAlwaysLightPath.current = true
      return
    }
    
    const stored = (() => {
      try {
        const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
        if (raw === "light" || raw === "dark" || raw === "system") return raw
      } catch {
        // ignore
      }
      return null
    })()
    const preference = stored ?? initialTheme
    
    if (wasOnAlwaysLightPath.current) {
      useThemeStore.getState().setPreference(preference, { persist: false })
      wasOnAlwaysLightPath.current = false
      return
    }
    
    const current = useThemeStore.getState().preference
    if (current === preference) return
    useThemeStore.getState().setPreference(preference, { persist: false })
  }, [pathname, initialTheme])

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (isAlwaysLightPath(window.location.pathname)) return
      useThemeStore.getState().syncSystemChange()
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return null
}
