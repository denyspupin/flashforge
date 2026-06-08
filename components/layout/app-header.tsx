import Link from "next/link"
import { cn } from "@/lib/utils"
import { Wordmark } from "./wordmark"

export function AppHeader({
  brandHref = "/",
  brand = <Wordmark />,
  nav,
  actions,
}: {
  brandHref?: string
  brand?: React.ReactNode
  nav?: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-6 lg:px-10">
        <Link
          href={brandHref}
          className="group flex shrink-0 items-center text-ink transition-opacity hover:opacity-80"
        >
          {brand}
        </Link>

        {nav ? <div className={cn("hidden items-center md:flex")}>{nav}</div> : null}

        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  )
}
