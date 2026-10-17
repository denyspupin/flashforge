"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import {
  ArrowLeft,
  Globe,
  Layers,
  LayoutDashboard,
  Library,
  Menu,
  MessageSquareQuote,
  Shield,
  Tag,
  type LucideIcon,
} from "lucide-react"

import { AdminMobileNav } from "@/components/layout/admin-mobile-nav"
import { PageTransition } from "@/components/layout/page-transition"
import { ThemeQuickToggle } from "@/components/theme/theme-quick-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { cn } from "@/lib/utils"
import { Wordmark } from "./wordmark"

type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  match?: (pathname: string) => boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/admin",
  },
  { href: "/admin/users", label: "Users", icon: Shield },
  { href: "/admin/decks", label: "Decks", icon: Library },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/prompts", label: "Prompts", icon: MessageSquareQuote },
  { href: "/admin/topics", label: "Topics", icon: Tag },
  { href: "/admin/languages", label: "Languages", icon: Globe },
]

function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

const linkBaseClass =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"

function AdminBadge() {
  return (
    <span
      className="font-mono-tag rounded-md border border-ember/30 bg-ember/8 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-ember"
      aria-label="Admin area"
    >
      Admin
    </span>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  match,
  pathname,
}: {
  href: string
  label: string
  icon: LucideIcon
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

function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ink/8 bg-paper lg:flex">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/admin" className="inline-flex text-lg text-ink">
          <Wordmark />
        </Link>
        <AdminBadge />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            match={item.match}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="flex flex-col border-t border-ink/8 px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Back to app
        </Link>
        <div className="mt-1">
          <UserMenu presentation="row" showQuickLinks={false} />
        </div>
      </div>
    </aside>
  )
}

function AdminMobileTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/70 backdrop-blur-md lg:hidden">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-lg text-ink"
        >
          <Wordmark />
          <AdminBadge />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeQuickToggle />
          <UserMenu />
          <AdminMobileNav
            brand={
              <span className="inline-flex items-center gap-2">
                <Wordmark className="text-lg" />
                <AdminBadge />
              </span>
            }
            trigger={
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <Menu className="h-5 w-5" />
              </button>
            }
          />
        </div>
      </div>
    </header>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="relative min-h-dvh">
      <AdminSidebar />
      <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:pl-60">
        <AdminMobileTopBar />
        <div ref={scrollRef} className="flex-1 min-h-0 lg:overflow-y-auto">
          <main className="w-full px-4 py-4 pb-8 sm:px-6 sm:py-6 lg:px-8 lg:pb-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </div>
  )
}
