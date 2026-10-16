"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, Layers, LayoutDashboard, Library, MoreHorizontal } from "lucide-react"

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

  const moreActive = MORE_ROUTES.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  )

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/8 bg-paper/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-5 items-stretch">
        {TABS.map((tab) => {
          const active = tab.match
            ? tab.match(pathname)
            : matches(pathname, tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-ember" : "text-ink/60 hover:text-ink",
              )}
            >
              <tab.icon
                className={cn("h-5 w-5", active && "text-ember")}
                strokeWidth={active ? 2 : 1.75}
              />
              {tab.label}
            </Link>
          )
        })}

        <MobileNav
          brand={<Wordmark className="text-lg text-ink" />}
          footer={<MobileUserFooterWithAdmin />}
          trigger={
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                moreActive ? "text-ember" : "text-ink/60 hover:text-ink",
              )}
            >
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
              More
            </button>
          }
        />
      </div>
    </nav>
  )
}
