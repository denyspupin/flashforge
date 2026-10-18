"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsUp, Compass, Layers, LayoutDashboard, Library } from "lucide-react"

import { MobileUserFooterWithAdmin } from "@/components/layout/mobile-user-footer-with-admin"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Wordmark } from "@/components/layout/wordmark"
import { cn } from "@/lib/utils"

const TABS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/dashboard",
  },
  { href: "/decks", label: "Decks", icon: Library },
  { href: "/collections", label: "Collections", icon: Layers },
  { href: "/explore", label: "Explore", icon: Compass },
]

const MORE_ROUTES = ["/notifications", "/history", "/profile", "/admin"]

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileTabBar() {
  const pathname = usePathname()

  const menuActive = MORE_ROUTES.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  )

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
      active ? "text-ember" : "text-ink/60 hover:text-ink",
    )

  const tabs = (from: number, to = TABS.length) =>
    TABS.slice(from, to).map((tab) => {
      const active = tab.match
        ? tab.match(pathname)
        : matches(pathname, tab.href)

      return (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={active ? "page" : undefined}
          className={tabClass(active)}
        >
          <tab.icon
            className={cn("h-6 w-6", active && "text-ember")}
            strokeWidth={active ? 2 : 1.75}
          />
          {tab.label}
        </Link>
      )
    })

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/8 bg-paper/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-5 items-stretch">
        {tabs(0, 2)}
        <MobileNav
          brand={<Wordmark className="text-lg text-ink" />}
          footer={<MobileUserFooterWithAdmin />}
          trigger={
            <button
              type="button"
              aria-current={menuActive ? "page" : undefined}
              className={tabClass(menuActive)}
            >
              <ChevronsUp
                className={cn("h-6 w-6", menuActive && "text-ember")}
                strokeWidth={menuActive ? 2 : 1.75}
              />
              Menu
            </button>
          }
        />
        {tabs(2)}
      </div>
    </nav>
  )
}
