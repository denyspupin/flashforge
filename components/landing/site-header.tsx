import Link from "next/link"
import type { ReactNode } from "react"
import {
  Bell,
  Compass,
  Layers,
  Library,
  LayoutDashboard,
  Trophy,
} from "lucide-react"

import { auth } from "@clerk/nextjs/server"

import { HeaderActions } from "@/components/layout/header-actions"
import { Wordmark } from "@/components/layout/wordmark"
import { SiteMobileNav } from "@/components/landing/site-mobile-nav"

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
    <nav className="hidden items-center gap-1 md:flex">
      <Link
        href="/explore"
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Explore
      </Link>
      <Link
        href="/#process"
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        How it works
      </Link>
      <Link
        href="/#library"
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Library
      </Link>
    </nav>
  )
}

export async function SiteHeader() {
  const { userId } = await auth()
  const signedIn = Boolean(userId)

  const mobileItems = signedIn
    ? [...DASHBOARD_NAV_ITEMS, ...PUBLIC_NAV_ITEMS.filter((item) => item.href !== "/explore")]
    : PUBLIC_NAV_ITEMS

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-5 sm:gap-6 sm:px-6 lg:gap-8 lg:px-10">
        <Link
          href={signedIn ? "/dashboard" : "/"}
          className="group flex shrink-0 items-center text-foreground transition-opacity hover:opacity-80"
        >
          <Wordmark />
        </Link>

        <PublicNav />

        <div className="ml-auto flex items-center gap-2">
          <HeaderActions />
          <SiteMobileNav items={mobileItems} signedIn={signedIn} />
        </div>
      </div>
    </header>
  )
}