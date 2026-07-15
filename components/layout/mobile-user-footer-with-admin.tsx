"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Shield } from "lucide-react"

import { MobileUserFooter } from "@/components/layout/mobile-user-footer"
import { useMobileNav } from "@/components/layout/mobile-nav"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"

type MeResponse = {
  id: string
  name: string | null
  avatarUrl: string | null
  role: "user" | "curator" | "admin"
}

async function fetchMe(): Promise<{ data: MeResponse }> {
  const res = await fetch("/api/v1/users/me")
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"

const iconWrapClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/70"

export function MobileUserFooterWithAdmin() {
  const { close } = useMobileNav()
  const { data } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    staleTime: 60_000,
  })

  const isAdmin = data?.data?.role === "admin"

  return (
    <div className="flex flex-col gap-1">
      {isAdmin ? (
        <Link href="/admin" onClick={close} className={linkClass}>
          <span className={iconWrapClass}>
            <Shield className="h-4 w-4" strokeWidth={1.75} />
          </span>
          Admin
        </Link>
      ) : null}
      <MobileUserFooter />
    </div>
  )
}
