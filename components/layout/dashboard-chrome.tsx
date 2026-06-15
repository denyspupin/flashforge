import Link from "next/link"
import {
  LayoutDashboard,
  Library,
  Compass,
  Plus,
  Sparkles,
} from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"
import { Wordmark } from "./wordmark"

const NAV_ITEMS = [
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
]

const BOTTOM_NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.75} />,
    exact: true,
  },
  {
    href: "/decks",
    label: "Decks",
    icon: <Library className="h-5 w-5" strokeWidth={1.75} />,
  },
  {
    href: "/explore",
    label: "Explore",
    icon: <Compass className="h-5 w-5" strokeWidth={1.75} />,
  },
]

function DashboardNav() {
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-ink/80 hover:text-ink"
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  )
}

function DashboardActions() {
  return <UserMenu />
}

export function DashboardHeader() {
  return (
    <AppHeader
      brandHref="/dashboard"
      brand={<Wordmark />}
      nav={<DashboardNav />}
      actions={<DashboardActions />}
      mobileNav={
        <MobileNav
          items={NAV_ITEMS}
          brand={
            <span className="font-display text-lg font-medium tracking-tight text-ink">
              Flash<span className="font-display-soft italic text-ember">forge</span>
            </span>
          }
        />
      }
    />
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 pb-safe pt-4 sm:px-6 sm:pt-6">
        {children}
      </main>
      <MobileBottomNav items={BOTTOM_NAV_ITEMS} />
    </div>
  )
}
