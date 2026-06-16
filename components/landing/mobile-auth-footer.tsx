"use client"

import Link from "next/link"
import { LogIn, UserPlus } from "lucide-react"

import { useMobileNav } from "@/components/layout/mobile-nav"

export function MobileAuthFooter() {
  const { close } = useMobileNav()

  return (
    <div className="flex flex-col gap-1">
      <Link
        href="/login"
        onClick={close}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/70">
          <LogIn className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Sign in
      </Link>
      <Link
        href="/register"
        onClick={close}
        className="flex items-center gap-3 rounded-xl bg-ink px-3 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-paper/15 text-paper">
          <UserPlus className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Start forging
      </Link>
    </div>
  )
}
