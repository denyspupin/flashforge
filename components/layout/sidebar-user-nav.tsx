"use client"

import Link from "next/link"
import { useClerk } from "@clerk/nextjs"
import { Bell, History, LogOut, Settings, User as UserIcon } from "lucide-react"

import {
  AppShellNav,
  AppShellNavItem,
  useAppShell,
} from "@/components/garn/app-shell"
import { Separator } from "@/components/garn/separator"

export function SidebarUserNav() {
  const { signOut, openUserProfile } = useClerk()
  const { isMobile, setOpenMobile } = useAppShell()

  const close = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <div className="flex flex-col gap-[var(--garn-gap-inline)]">
      <Separator />
      <AppShellNav aria-label="Account">
        <AppShellNavItem asChild icon={<Bell />}>
          <Link href="/notifications" onClick={close}>
            <span data-slot="button-label" className="min-w-0 truncate">
              Notifications
            </span>
          </Link>
        </AppShellNavItem>
        <AppShellNavItem asChild icon={<History />}>
          <Link href="/history" onClick={close}>
            <span data-slot="button-label" className="min-w-0 truncate">
              Study history
            </span>
          </Link>
        </AppShellNavItem>
        <AppShellNavItem asChild icon={<UserIcon />}>
          <Link href="/profile" onClick={close}>
            <span data-slot="button-label" className="min-w-0 truncate">
              Profile
            </span>
          </Link>
        </AppShellNavItem>
        <AppShellNavItem
          icon={<Settings />}
          onClick={() => {
            close()
            openUserProfile()
          }}
        >
          Account settings
        </AppShellNavItem>
        <AppShellNavItem
          tone="danger"
          icon={<LogOut />}
          onClick={() => {
            close()
            signOut({ redirectUrl: "/" })
          }}
        >
          Sign out
        </AppShellNavItem>
      </AppShellNav>
    </div>
  )
}