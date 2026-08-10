"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useClerk, useUser } from "@clerk/nextjs"
import {
  Bell,
  History,
  LogOut,
  Settings,
  Shield,
  User as UserIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarSkeleton,
} from "@/components/garn/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/garn/dropdown-menu"
import { queryKeys } from "@/hooks"
import { cn } from "@/lib/utils"

type UserMenuProps = {
  className?: string
  redirectUrl?: string
}

type MeResponse = {
  id: string
  name: string | null
  avatarUrl: string | null
  role: "user" | "curator" | "admin"
  theme: "light" | "dark" | "system"
}

async function fetchMe(): Promise<{ data: MeResponse }> {
  const res = await fetch("/api/v1/users/me")
  if (!res.ok) throw new Error("Failed to fetch user")
  return res.json()
}

function initialsFrom(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined
): string {
  const a = (firstName ?? "").trim()
  const b = (lastName ?? "").trim()
  if (a || b) {
    return (a[0] ?? "" + (b[0] ?? "")).toUpperCase() || "?"
  }
  const handle = (email ?? "").split("@")[0] ?? ""
  return handle.slice(0, 2).toUpperCase() || "?"
}

function fullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  username: string | null | undefined
): string {
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim()
  if (combined) return combined
  return username?.trim() || ""
}

export function UserMenu({ className, redirectUrl = "/" }: UserMenuProps) {
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut, openUserProfile } = useClerk()

  const { data: meData } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: fetchMe,
    enabled: isSignedIn,
    staleTime: 60_000,
  })

  if (!isLoaded) {
    return <AvatarSkeleton size="sm" className={className} />
  }

  if (!isSignedIn || !user) {
    return null
  }

  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null

  const displayName = fullName(user.firstName, user.lastName, user.username)
  const initials = initialsFrom(user.firstName, user.lastName, primaryEmail)
  const avatarUrl = meData?.data?.avatarUrl ?? user.imageUrl

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className={cn(
            "flex items-center gap-2 rounded-full py-0.5 pr-0.5 pl-2.5 ring-1 ring-border transition-colors hover:bg-state-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
        >
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {displayName || "Learner"}
          </span>
          <Avatar size="sm">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName || "User"} />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar size="md">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName || "User"} />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {displayName || "Learner"}
            </p>
            {primaryEmail ? (
              <p className="text-muted-foreground truncate text-xs">
                {primaryEmail}
              </p>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push("/notifications")}>
          <Bell className="h-4 w-4" />
          Notifications
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push("/history")}>
          <History className="h-4 w-4" />
          Study history
        </DropdownMenuItem>

        {meData?.data?.role === "admin" ? (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            <Shield className="h-4 w-4" />
            Admin
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="pt-1.5 pb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Account
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserIcon className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openUserProfile()}>
          <Settings className="h-4 w-4" />
          Account settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => signOut({ redirectUrl })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}