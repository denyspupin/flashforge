import Link from "next/link"
import type { ReactNode } from "react"
import { Bell, Compass, Layers, Library, LayoutDashboard, Trophy } from "lucide-react"

import { auth } from "@clerk/nextjs/server"

import { AppHeader } from "@/components/layout/app-header"
import { HeaderActions } from "@/components/layout/header-actions"
import { MobileNav } from "@/components/layout/mobile-nav"

type NavItem = { href: string; label: string; icon: ReactNode }

const PUBLIC_NAV_ITEMS: NavItem[] = [
  {
    href: "/explore",
    label: "Explore",
    icon: <Compass className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/#process",
    label: "How it works",
    icon: <Layers className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/#library",
    label: "Library",
    icon: <Library className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/#gamification",
    label: "Streaks & XP",
    icon: <Trophy className="h-4 w-4" strokeWidth={1.75} />,
  },
]

const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/decks",
    label: "My Decks",
    icon: <Library className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/explore",
    label: "Explore",
    icon: <Compass className="h-4 w-4" strokeWidth={1.75} />,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" strokeWidth={1.75} />,
  },
]

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
        href="/#process"
        className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
      >
        How it works
      </Link>
      <Link
        href="/#library"
        className="rounded-md px-3 py-1.5 text-sm text-ink/70 transition-colors hover:text-ink"
      >
        Library
      </Link>
    </nav>
  )
}

const BRAND = (
  <span className="font-display text-lg font-medium tracking-tight text-ink">
    Flash<span className="font-display-soft italic text-ember">forge</span>
  </span>
)

export async function SiteHeader() {
  const { userId } = await auth()
  const signedIn = Boolean(userId)

  const mobileItems = signedIn
    ? [...DASHBOARD_NAV_ITEMS, ...PUBLIC_NAV_ITEMS]
    : PUBLIC_NAV_ITEMS

  return (
    <AppHeader
      nav={<PublicNav />}
      actions={<HeaderActions />}
      mobileNav={<MobileNav items={mobileItems} brand={BRAND} />}
    />
  )
}
