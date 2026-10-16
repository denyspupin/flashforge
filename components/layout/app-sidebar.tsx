"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Bell,
  Compass,
  History,
  Layers,
  LayoutDashboard,
  Library,
  Shield,
} from "lucide-react"

import { ThemeQuickToggle } from "@/components/theme/theme-quick-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { queryKeys } from "@/hooks"
import type { ApiResponse } from "@/lib/api/response"
import { cn } from "@/lib/utils"
import { Wordmark } from "./wordmark"

type MeResponse = {
  id: string
  role: "user" | "curator" | "admin"
}

async function fetchMe(): Promise<ApiResponse<MeResponse>> {
  const res = await fetch("/api/v1/users/me")
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

const PRIMARY_NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/dashboard",
  },
  { href: "/decks", label: "My Decks", icon: Library },
  { href: "/collections", label: "Collections", icon: Layers },
  { href: "/explore", label: "Explore", icon: Compass },
]

const SECONDARY_NAV = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/history", label: "Study history", icon: History },
]

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

const groupLabelClass =
  "px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"

const linkBaseClass =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"

function NavItem({
  href,
  label,
  icon: Icon,
  match,
  pathname,
}: {
  href: string
  label: string
  icon: typeof Library
  match?: (pathname: string) => boolean
  pathname: string
}) {
  const isActive = match ? match(pathname) : matches(pathname, href)

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        linkBaseClass,
        isActive
          ? "bg-ember/10 text-ember"
          : "text-ink/75 hover:bg-ink/5 hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {label}
    </Link>
  )
}

function SidebarAdminLink() {
  const { data } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    staleTime: 60_000,
  })

  if (data?.data?.role !== "admin") return null

  return (
    <Link
      href="/admin"
      aria-label="Admin area"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink",
      )}
    >
      <Shield className="h-4 w-4" strokeWidth={1.75} />
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ink/8 bg-paper lg:flex">
      <div className="px-5 pt-5 pb-2">
        <Link href="/dashboard" className="inline-flex text-lg text-ink">
          <Wordmark />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {PRIMARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            match={"match" in item ? item.match : undefined}
            pathname={pathname}
          />
        ))}

        <p className={groupLabelClass}>Account</p>
        {SECONDARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="flex items-center gap-1 border-t border-ink/8 px-4 py-3">
        <ThemeQuickToggle />
        <SidebarAdminLink />
        <div className="ml-auto">
          <UserMenu />
        </div>
      </div>
    </aside>
  )
}
