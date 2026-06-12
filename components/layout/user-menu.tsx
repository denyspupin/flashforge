"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useClerk, useUser } from "@clerk/nextjs"
import { LogOut, Settings, User as UserIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type UserMenuProps = {
  className?: string
  redirectUrl?: string
}

type MeResponse = {
  id: string
  name: string | null
  avatarUrl: string | null
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
    queryKey: ["users", "me"],
    queryFn: fetchMe,
    enabled: isSignedIn,
    staleTime: 60_000,
  })

  if (!isLoaded) {
    return (
      <div
        aria-hidden
        className={cn("h-8 w-8 animate-pulse rounded-full bg-ink/10", className)}
      />
    )
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
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Open user menu"
            className={cn(
              "flex items-center gap-2 rounded-full py-0.5 pr-0.5 pl-2.5 ring-1 ring-ink/10 transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
              className,
            )}
          />
        }
      >
        <span className="hidden text-sm font-medium text-ink/80 sm:inline">
          {displayName || "Learner"}
        </span>
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-ember/12 font-display text-xs text-ember">
              {initials}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              aria-hidden
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember/12 font-display text-sm text-ember">
              {initials}
            </div>
          )}
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

        <p className="px-2 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Account
        </p>
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
          variant="destructive"
          onClick={() => signOut({ redirectUrl })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
