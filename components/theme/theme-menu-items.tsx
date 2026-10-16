"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Monitor, Moon, Sun } from "lucide-react"

import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { queryKeys, useTheme } from "@/hooks"
import type { Theme } from "@/lib/constants"
import type { LucideIcon } from "lucide-react"

const OPTIONS: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export function ThemeMenuItems() {
  const queryClient = useQueryClient()
  const { preference, setPreference } = useTheme()

  const select = async (next: Theme) => {
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
      // local preference already applied
    }
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        Theme
      </DropdownMenuLabel>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuCheckboxItem
          key={value}
          checked={preference === value}
          onCheckedChange={() => select(value)}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuGroup>
  )
}
