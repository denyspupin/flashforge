import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Wordmark } from "./wordmark"

export function AppHeader({
  brandHref = "/",
  brand = <Wordmark />,
  nav,
  actions,
  mobileNav,
}: {
  brandHref?: string
  brand?: ReactNode
  nav?: ReactNode
  actions: ReactNode
  mobileNav?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-5 sm:gap-6 sm:px-6 lg:gap-8 lg:px-10">
        <Link
          href={brandHref}
          className="group flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
        >
          {brand}
        </Link>

        {nav ? <div className={cn("hidden items-center md:flex")}>{nav}</div> : null}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2">{actions}</div>
          {mobileNav}
        </div>
      </div>
    </header>
  )
}
