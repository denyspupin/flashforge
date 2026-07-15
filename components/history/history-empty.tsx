"use client"

import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { History, Library } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HistoryEmpty() {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
      <div className="bg-ember/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <History className="text-ember h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold">No study sessions yet</h3>
      <p className="text-muted-foreground mt-1 mb-4 max-w-sm text-sm">
        Once you start studying a deck, your completed sessions will appear
        here so you can revisit and study them again.
      </p>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
        <Link href="/decks" className="w-full sm:w-auto">
          <Button className="w-full">
            <Library className="mr-2 h-4 w-4" />
            Browse my decks
          </Button>
        </Link>
        <Link href="/explore" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full">
            Explore community
          </Button>
        </Link>
      </div>
    </Card>
  )
}

export function HistoryNoMatches() {
  return (
    <Card>
      <CardContent className="text-muted-foreground p-10 text-center text-sm">
        No sessions match these filters.
      </CardContent>
    </Card>
  )
}
