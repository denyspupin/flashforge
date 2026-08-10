"use client"

import Link from "next/link"
import { Show } from "@clerk/nextjs"
import { LayoutDashboard, Plus } from "lucide-react"
import { Button } from "@/components/garn/button"
import { UserMenu } from "@/components/layout/user-menu"
import { cn } from "@/lib/utils"

export function HeaderActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Show
        when="signed-out"
        fallback={
          <Show when="signed-in">
            <Link href="/dashboard" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                <LayoutDashboard />
                Dashboard
              </Button>
            </Link>
            <Link href="/decks" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                <Plus />
                New deck
              </Button>
            </Link>
            <div className="ml-1 hidden sm:block">
              <UserMenu />
            </div>
          </Show>
        }
      >
        <Link href="/login" className="hidden sm:inline-flex">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/register" className="hidden sm:inline-flex">
          <Button size="sm">Start forging</Button>
        </Link>
      </Show>
    </div>
  )
}