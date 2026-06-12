"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Compass, LayoutDashboard, Library } from "lucide-react"

import { cn } from "@/lib/utils"

type BottomNavItem = {
  href: string
  label: string
  icon: ReactNode
  exact?: boolean
}

const DEFAULT_ITEMS: BottomNavItem[] = [
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

function isActive(item: BottomNavItem, pathname: string) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function MobileBottomNav({ items = DEFAULT_ITEMS }: { items?: BottomNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between gap-1">
        {items.map((item) => {
          const active = isActive(item, pathname)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-colors",
                  active
                    ? "text-ember"
                    : "text-ink/55 active:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center",
                    active && "[&_svg]:text-ember",
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
