"use client"

import {
  LayoutDashboard,
  Library,
  Tag,
  Globe,
  Shield,
  MessageSquareQuote,
  Layers,
  type LucideIcon,
} from "lucide-react"

import { AdminMobileFooter } from "@/components/layout/admin-mobile-footer"
import { MobileNav } from "@/components/layout/mobile-nav"

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
  {
    href: "/admin/prompts",
    label: "Prompts",
    icon: MessageSquareQuote,
  },
  { href: "/admin/topics", label: "Topics", icon: Tag },
  { href: "/admin/languages", label: "Languages", icon: Globe },
]

export function AdminMobileNav({
  brand,
}: {
  brand: React.ReactNode
}) {
  return (
    <MobileNav
      items={NAV_ITEMS.map((item) => ({
        href: item.href,
        label: item.label,
        icon: <item.icon className="h-4 w-4" strokeWidth={1.75} />,
        match: item.match,
      }))}
      brand={brand}
      footer={<AdminMobileFooter />}
    />
  )
}
