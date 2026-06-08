import Link from "next/link"
import { AppHeader } from "@/components/layout/app-header"
import { HeaderActions } from "@/components/layout/header-actions"

function PublicNav() {
  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/explore"
        className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
      >
        Explore
      </Link>
      <Link
        href="#process"
        className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
      >
        How it works
      </Link>
      <Link
        href="#library"
        className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
      >
        Library
      </Link>
    </nav>
  )
}

export function SiteHeader() {
  return <AppHeader nav={<PublicNav />} actions={<HeaderActions />} />
}
