"use client"

import Link from "next/link"
import { useClerk } from "@clerk/nextjs"
import { useState, type ReactNode } from "react"
import {
  Bell,
  History,
  LogIn,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
  UserPlus,
} from "lucide-react"

import { Button } from "@/components/garn/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/garn/sheet"

type NavItem = { href: string; label: string; icon: ReactNode }

const linkClass =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground"

export function SiteMobileNav({
  items,
  signedIn,
}: {
  items: NavItem[]
  signedIn: boolean
}) {
  const [open, setOpen] = useState(false)
  const { signOut, openUserProfile } = useClerk()

  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-72 flex-col gap-0">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={linkClass}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-border pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {signedIn ? (
            <>
              <Link
                href="/notifications"
                onClick={close}
                className={linkClass}
              >
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
              <Link href="/history" onClick={close} className={linkClass}>
                <History className="h-4 w-4" />
                Study history
              </Link>
              <Link href="/profile" onClick={close} className={linkClass}>
                <UserIcon className="h-4 w-4" />
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  close()
                  openUserProfile()
                }}
                className={linkClass}
              >
                <Settings className="h-4 w-4" />
                Account settings
              </button>
              <button
                type="button"
                onClick={() => {
                  close()
                  signOut({ redirectUrl: "/" })
                }}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={close}
                className={linkClass}
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="flex items-center gap-3 rounded-md bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
              >
                <UserPlus className="h-4 w-4" />
                Start forging
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}