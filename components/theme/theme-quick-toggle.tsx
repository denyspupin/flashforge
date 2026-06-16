"use client"

import { useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { queryKeys, useTheme } from "@/hooks"
import { useThemeStore } from "@/stores"
import { cn } from "@/lib/utils"

function useResolvedTheme() {
  return useSyncExternalStore(
    useThemeStore.subscribe,
    () => useThemeStore.getState().resolved,
    () => "light"
  )
}

export function ThemeQuickToggle() {
  const queryClient = useQueryClient()
  const { setPreference } = useTheme()
  const resolved = useResolvedTheme()
  const isDark = resolved === "dark"

  const toggle = async () => {
    const next = isDark ? "light" : "dark"
    setPreference(next)
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
        await queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      }
    } catch {
      // local change already applied
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "h-9 w-9 text-ink/70 hover:bg-ink/5 hover:text-ink",
        "dark:hover:bg-muted/50"
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  )
}
