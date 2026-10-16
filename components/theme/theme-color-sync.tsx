"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { useThemeStore } from "@/stores"
import { isAlwaysLightPath, PAPER_HEX } from "@/lib/theme"

export function ThemeColorSync() {
  const pathname = usePathname()
  const resolved = useThemeStore((s) => s.resolved)

  useEffect(() => {
    const color = isAlwaysLightPath(pathname) ? PAPER_HEX.light : PAPER_HEX[resolved]
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", color)
    })
  }, [pathname, resolved])

  return null
}
