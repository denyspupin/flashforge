"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Bell, History, LogOut, Settings, User as UserIcon } from "lucide-react"

import { useMobileNav } from "@/components/layout/mobile-nav"

const baseLink =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"

const linkClass = `${baseLink} text-ink/80 hover:bg-ink/5 hover:text-ink`

const destructiveLinkClass = `${baseLink} text-destructive hover:bg-destructive/10 hover:text-destructive`

const baseIconWrap =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"

const iconWrapClass = `${baseIconWrap} bg-ink/5 text-ink/70`

const destructiveIconWrapClass = `${baseIconWrap} bg-destructive/10 text-destructive`

export function MobileUserFooter() {
  const { close } = useMobileNav()
  const router = useRouter()
  const { signOut, openUserProfile } = useClerk()

  const handleSignOut = () => {
    close()
    signOut({ redirectUrl: "/" })
  }

  const handleAccountSettings = () => {
    close()
    openUserProfile()
  }

  const handleProfile = () => {
    close()
    router.push("/profile")
  }

  return (
    <div className="flex flex-col gap-1">
      <Link href="/notifications" onClick={close} className={linkClass}>
        <span className={iconWrapClass}>
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Notifications
      </Link>
      <Link href="/history" onClick={close} className={linkClass}>
        <span className={iconWrapClass}>
          <History className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Study history
      </Link>
      <button type="button" onClick={handleProfile} className={linkClass}>
        <span className={iconWrapClass}>
          <UserIcon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Profile
      </button>
      <button type="button" onClick={handleAccountSettings} className={linkClass}>
        <span className={iconWrapClass}>
          <Settings className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Account settings
      </button>
      <button type="button" onClick={handleSignOut} className={destructiveLinkClass}>
        <span className={destructiveIconWrapClass}>
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Sign out
      </button>
    </div>
  )
}
