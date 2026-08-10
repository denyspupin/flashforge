"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  Globe,
  Layers,
  LayoutDashboard,
  Library,
  MessageSquareQuote,
  Shield,
  Tag,
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
import { Badge } from "@/components/garn/badge"
import { Button } from "@/components/garn/button"
import { ThemeQuickToggle } from "@/components/theme/theme-quick-toggle"
import { cn } from "@/lib/utils"
import { UserMenu } from "./user-menu"

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Shield },
  { href: "/admin/decks", label: "Decks", icon: Library },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/prompts", label: "Prompts", icon: MessageSquareQuote },
  { href: "/admin/topics", label: "Topics", icon: Tag },
  { href: "/admin/languages", label: "Languages", icon: Globe },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminBrand() {
  return (
    <Link
      href="/admin"
      aria-label="FlashForge admin"
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
          "flex items-center gap-2 text-lg font-semibold tracking-tight",
          "group-data-[state=collapsed]/app-shell:hidden"
        )}
      >
        Flash<span>forge</span>
        <Badge tone="neutral" appearance="soft" size="sm">
          Admin
        </Badge>
      </span>
    </Link>
  )
}

function AdminNav() {
  const pathname = usePathname()
  return (
    <AppShellNav aria-label="Admin navigation">
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

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell appearance="framed">
      <AppShellSidebar appearance="raised" collapsible="icon">
        <AdminBrand />
        <AdminNav />
      </AppShellSidebar>
      <AppShellContent>
        <AppShellHeader>
          <AppShellTrigger />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">
              <ArrowLeft />
              Back to app
            </Link>
          </Button>
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