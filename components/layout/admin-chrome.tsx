import Link from "next/link"
import {
  LayoutDashboard,
  Library,
  Tag,
  Globe,
  Shield,
  ArrowLeft,
  MessageSquareQuote,
} from "lucide-react"

import { AdminMobileNav } from "@/components/layout/admin-mobile-nav"
import { AppHeader } from "@/components/layout/app-header"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Shield },
  { href: "/admin/decks", label: "Decks", icon: Library },
  { href: "/admin/prompts", label: "Prompts", icon: MessageSquareQuote },
  { href: "/admin/topics", label: "Topics", icon: Tag },
  { href: "/admin/languages", label: "Languages", icon: Globe },
]

function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-lg font-medium tracking-tight text-ink">
        Flash<span className="font-display-soft italic text-ember">forge</span>
      </span>
      <span
        className="font-mono-tag rounded-md border border-ember/30 bg-ember/8 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-ember"
        aria-label="Admin area"
      >
        Admin
      </span>
    </div>
  )
}

function AdminDesktopNav() {
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-ink/80 hover:text-ink"
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              {item.label}
            </Button>
          </Link>
        )
      })}
    </nav>
  )
}

function AdminActions() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className="hidden sm:block">
        <Button variant="ghost" size="sm" className="h-9 sm:h-9 px-3 sm:px-3 text-ink/70">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
          Back to app
        </Button>
      </Link>
      <div className="hidden sm:block">
        <UserMenu />
      </div>
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        brandHref="/admin"
        brand={<AdminBrand />}
        nav={<AdminDesktopNav />}
        actions={<AdminActions />}
        mobileNav={<AdminMobileNav brand={<AdminBrand />} />}
      />
      <main
        className={cn(
          "flex-1 mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6",
        )}
      >
        {children}
      </main>
    </div>
  )
}
