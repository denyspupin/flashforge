"use client"

import Link from "next/link"
import { Show, UserButton } from "@clerk/nextjs"
import { LayoutDashboard, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function HeaderActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Show
        when="signed-out"
        fallback={
          <Show when="signed-in">
            <Link href="/dashboard" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-ink/80 hover:text-ink"
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/decks" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-ink/80 hover:text-ink"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New deck
              </Button>
            </Link>
            <div className="ml-1">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
          </Show>
        }
      >
        <Link href="/login" className="hidden sm:block">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-ink/80 hover:text-ink"
          >
            Sign in
          </Button>
        </Link>
        <Link href="/register">
          <Button
            size="sm"
            className="h-9 rounded-full bg-ink px-4 text-paper hover:bg-ink/85"
          >
            Start forging
          </Button>
        </Link>
      </Show>
    </div>
  )
}
