"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { PageTransition } from "@/components/layout/page-transition"
import { ThemeQuickToggle } from "@/components/theme/theme-quick-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { cn } from "@/lib/utils"
import { Wordmark } from "./wordmark"

const FOCUS_PATTERN = /^\/study\/[^/]+/

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/70 backdrop-blur-md lg:hidden">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="inline-flex text-lg text-ink">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeQuickToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export function DashboardShell({
  children,
  bleed = false,
}: {
  children: React.ReactNode
  bleed?: boolean
}) {
  const pathname = usePathname()
  const focus = FOCUS_PATTERN.test(pathname)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="relative min-h-dvh">
      {focus ? null : <AppSidebar />}
      <div
        className={cn(
          "flex min-h-dvh flex-col lg:h-dvh",
          !focus && "lg:pl-60 lg:min-h-0",
        )}
      >
        {focus ? null : <MobileTopBar />}
        {bleed ? (
          <div
            ref={scrollRef}
            className={cn(
              "flex-1 min-h-0 lg:overflow-y-auto",
              !focus && "pb-24 sm:pb-28 lg:pb-6",
            )}
          >
            {children}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 lg:overflow-y-auto"
          >
            <main
              className={cn(
                "w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8",
                !focus && "pb-24 sm:pb-28 lg:pb-6",
              )}
            >
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        )}
        {focus ? null : <MobileTabBar />}
      </div>
    </div>
  )
}
