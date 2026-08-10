"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Library,
} from "lucide-react"

import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellNav,
  AppShellNavItem,
  AppShellSidebar,
  AppShellTrigger,
} from "@/components/garn/app-shell"
import { ThemeQuickToggle } from "@/components/theme/theme-quick-toggle"
import { cn } from "@/lib/utils"
import { SidebarUserNav } from "./sidebar-user-nav"
import { UserMenu } from "./user-menu"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/decks", label: "My Decks", icon: Library },
  { href: "/collections", label: "Collections", icon: Layers },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/study", label: "Study", icon: GraduationCap },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      aria-label="FlashForge home"
      className="flex items-center gap-2 px-[var(--garn-space-8)] py-[var(--garn-space-8)]"
    >
      <Image
        src="/logo.png"
        alt=""
        width={20}
        height={20}
        priority
        className="h-5 w-5 shrink-0"
      />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          "group-data-[state=collapsed]/app-shell:hidden"
        )}
      >
        Flash<span>forge</span>
      </span>
    </Link>
  )
}

function SidebarNav() {
  const pathname = usePathname()
  return (
    <AppShellNav aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <AppShellNavItem
            key={item.href}
            asChild
            active={isActive(pathname, item.href)}
            icon={<Icon />}
          >
            <Link href={item.href}>
              <span data-slot="button-label" className="min-w-0 truncate">
                {item.label}
              </span>
            </Link>
          </AppShellNavItem>
        )
      })}
    </AppShellNav>
  )
}

export function DashboardAppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell appearance="framed">
      <AppShellSidebar appearance="raised" collapsible="icon">
        <SidebarBrand />
        <SidebarNav />
        <div className="mt-auto">
          <SidebarUserNav />
        </div>
      </AppShellSidebar>
      <AppShellContent>
        <AppShellHeader>
          <AppShellTrigger />
          <div className="ms-auto flex items-center gap-[var(--garn-gap-inline)]">
            <ThemeQuickToggle />
            <UserMenu />
          </div>
        </AppShellHeader>
        <AppShellMain>{children}</AppShellMain>
      </AppShellContent>
    </AppShell>
  )
}