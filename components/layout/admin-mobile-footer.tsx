"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { MobileNav, useMobileNav } from "@/components/layout/mobile-nav"
import { MobileUserFooter } from "@/components/layout/mobile-user-footer"

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"

const iconWrapClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/70"

export function AdminMobileFooter() {
  const { close } = useMobileNav()
  return (
    <div className="flex flex-col gap-1">
      <Link href="/dashboard" onClick={close} className={linkClass}>
        <span className={iconWrapClass}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Back to app
      </Link>
      <MobileUserFooter />
    </div>
  )
}
